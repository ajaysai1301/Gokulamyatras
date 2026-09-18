import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import EmbeddedPostgres from 'embedded-postgres';
import {randomBytes,randomUUID} from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
export async function disposablePostgres(port=55439){
 const password=randomBytes(24).toString('hex');
 const databaseDir=path.resolve('.test-data',randomUUID());await mkdir(databaseDir,{recursive:true});
 const pg=new EmbeddedPostgres({databaseDir,user:'postgres',password,port,persistent:true,postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:message=>console.error(String(message))});
 await pg.initialise();await pg.start();
 process.env.DATABASE_URL='postgresql://postgres:'+password+'@127.0.0.1:'+port+'/postgres?schema=public';
 try{execFileSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env:process.env,stdio:'pipe',windowsHide:true});}catch(e){await pg.stop();throw e;}
 const originalStop=pg.stop.bind(pg);
 pg.stop=async()=>{if(!existsSync(path.join(databaseDir,'postmaster.pid')))return;if(process.platform==='win32')execFileSync(path.resolve('node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe'),['-D',databaseDir,'-m','fast','-w','stop'],{stdio:'pipe',windowsHide:true});else await originalStop();};
 return pg;
}
