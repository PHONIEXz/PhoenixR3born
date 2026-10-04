import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {normalizeItems} from '../src/config.js';

// Take a normalized collection export before unpublishing the old CMS entries.
// Run this locally; the generated SQL contains the owner's email and must not
// be committed. The database requires that exact account's email be verified.
const [source,output]=process.argv.slice(2);
const email=process.env.P3_OWNER_EMAIL;
if(!source || !output || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
 throw new Error('Set P3_OWNER_EMAIL and run: node scripts/prepare-owner-import.mjs source.json /tmp/owner-import.sql');
}
const items=normalizeItems(JSON.parse(await readFile(source,'utf8')));
const literal=value=>value==null?'NULL':`'${String(value).replaceAll("'","''")}'`;
const delimiter=`$p3import_${randomUUID().replaceAll('-','')}$`;
let sql=`begin;\ndo ${delimiter}\ndeclare owner_uid uuid;\nbegin\n select id into strict owner_uid from auth.users where lower(email)=lower(${literal(email)}) and email_confirmed_at is not null;\n if not exists(select 1 from public.profiles where id=owner_uid) then\n  insert into public.profiles(id,username,display_name) values(owner_uid,'phoenixr3born','Phoenix');\n end if;\n`;
for(const item of items) {
 let description=item.description;
 if(item.link && ![item.websiteUrl,item.githubUrl].includes(item.link)) description+=`\nProject story: ${item.link}`;
 // Re-running the generated SQL is safe. Do not overwrite user-managed rows.
 sql+=` insert into public.submissions(id,author_id,title,summary,description,category,project_status,website_url,github_url,license,visibility) select ${literal(randomUUID())},owner_uid,${[item.title,item.summary,description,item.category,item.status,item.websiteUrl,item.githubUrl,'See source license','private'].map(literal).join(',')} where not exists(select 1 from public.submissions where author_id=owner_uid and title=${literal(item.title)} and github_url is not distinct from ${literal(item.githubUrl)});\n`;
}
sql+=`end;\n${delimiter};\ncommit;\n`;
await writeFile(output,sql,{mode:0o600});
console.log(`Prepared ${items.length} private resource imports. Apply after the private-spaces migration.`);
