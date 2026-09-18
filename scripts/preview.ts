/** Disposable local replica set and existing UI for browser verification. */
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb,closeDb } from '../lib/db/mongo';
import { ensureSeeded } from '../lib/services/yatra.service';
import { ensureSeededUsers } from '../lib/services/auth.service';
async function main() {
 process.env.MONGOMS_DOWNLOAD_DIR=path.resolve('../../mongo-binaries');
 const mongo=await MongoMemoryReplSet.create({binary:{version:'7.0.14'},replSet:{count:1,storageEngine:'wiredTiger'}});
 process.env.MONGO_URL=mongo.getUri();process.env.DB_NAME='browser_preview';
 process.env.AUTH_SECRET=crypto.randomBytes(48).toString('hex');
 process.env.ENABLE_DEMO_SEED='true';process.env.ENABLE_MOCK_PAYMENTS='true';
 process.env.NEXT_PUBLIC_BASE_URL='http://localhost:3000';
 await getDb();await ensureSeeded();await ensureSeededUsers();
 await closeDb();
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3000'],{env:process.env,stdio:'inherit',windowsHide:true});
 async function stop(){server.kill();await mongo.stop();process.exit();}
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
