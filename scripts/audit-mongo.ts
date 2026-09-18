import { inspectMongoData } from '../lib/db/preflight';
inspectMongoData().then(report=>{console.log(JSON.stringify(report,null,2));process.exitCode=report.pass?0:1;}).catch(error=>{console.error(error instanceof Error?error.message:'Preflight failed');process.exitCode=1;});
