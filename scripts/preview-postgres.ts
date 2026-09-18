import {spawn} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {disposablePostgres} from '../tests/helpers/postgres';
import {closePrisma} from '../lib/db/prisma';
import {getYatraRepository} from '../lib/repositories/yatra.repository';
import {getUserRepository} from '../lib/repositories/user.repository';
import {seedYatras} from '../lib/data/seed';
import {hashPassword} from '../lib/auth/crypto';
import {UserRole} from '../lib/domain/types';
async function main(){
 const pg=await disposablePostgres(55440);
 process.env.AUTH_SECRET=randomBytes(48).toString('hex');process.env.ENABLE_MOCK_PAYMENTS='true';process.env.ENABLE_DEMO_SEED='false';process.env.NEXT_PUBLIC_BASE_URL='http://127.0.0.1:3000';process.env.PAYMENT_CONFIG_ENCRYPTION_KEY=randomBytes(32).toString('hex');
 await getYatraRepository().insertMany(seedYatras().map(y=>({...y,booked:0})));
 const p=hashPassword('Disposable-test-only-123!');
 for(const role of [UserRole.ADMIN,UserRole.COORDINATOR])await getUserRepository().insertMany([{id:randomUUID(),email:role.toLowerCase()+'@example.test',name:role,role,active:true,passwordSalt:p.salt,passwordHash:p.hash,createdAt:new Date().toISOString()}]);
 await closePrisma();
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3000'],{env:process.env,stdio:'inherit',windowsHide:true});
 let stopping=false;async function stop(){if(stopping)return;stopping=true;server.kill();await pg.stop();process.exit();}
 process.on('SIGINT',stop);process.on('SIGTERM',stop);server.on('exit',stop);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
