import React from 'react';
import {createRoot} from 'react-dom/client';
import {Studio,defineConfig,defineType,defineField} from 'sanity';
import {structureTool} from 'sanity/structure';
import {projectId,dataset} from './config';
const resource=defineType({name:'resource',title:'Collection item',type:'document',fields:[
 defineField({name:'title',type:'string',validation:r=>r.required().max(100)}),
 defineField({name:'slug',type:'slug',options:{source:'title',maxLength:96},validation:r=>r.required()}),
 defineField({name:'category',type:'string',options:{list:['Projects','Tools','Learning','Downloads','Recommendations','Other']},initialValue:'Other',validation:r=>r.required()}),
 defineField({name:'status',title:'Project completion status',type:'string',options:{list:[{title:'In progress',value:'in-progress'},{title:'Completed',value:'completed'}],layout:'radio'},initialValue:'in-progress',description:'This is completion status, separate from draft or published.',hidden:({document})=>document?.category!=='Projects',validation:r=>r.custom((value,context)=>context.document?.category==='Projects'&&!['in-progress','completed'].includes(value)?'Choose the project status.':true)}),
 defineField({name:'websiteUrl',title:'Project website',type:'url',description:'For projects with a website, visitors see a Visit website button.',validation:r=>r.uri({scheme:['https']})}),
 defineField({name:'githubUrl',title:'GitHub repository',type:'url',description:'For downloadable projects, link to the repository containing setup instructions.',validation:r=>r.custom(value=>!value||/^https:\/\/github\.com\/[^/]+\/[^/]+/.test(value)?true:'Use an HTTPS GitHub repository URL.')}),
 defineField({name:'summary',title:'Short introduction',type:'text',rows:3,description:'Tell visitors what this is and why they might need it.',validation:r=>r.required().max(280)}),
 defineField({name:'description',title:'Your explanation',type:'text',rows:10,validation:r=>r.max(20000),description:'Write your recommendation, instructions, or notes. Paragraphs appear on the item page.'}),
 defineField({name:'cover',title:'Cover image',type:'image',options:{hotspot:true}}),
 defineField({name:'link',title:'Additional resource link',type:'url',validation:r=>r.uri({scheme:['https']})}),
 defineField({name:'label',title:'Link button text',type:'string',initialValue:'Check it out'}),
 defineField({name:'files',title:'Downloadable files',type:'array',validation:r=>r.max(20),description:'Documents, images, audio, video, archives and other files. File sizes are subject to Sanity plan limits. Use external links for large files.',of:[{type:'file',fields:[{name:'label',title:'Download label',type:'string'}]}]}),
 defineField({name:'featured',title:'Phoenix’s pick',type:'boolean',initialValue:false}),
 defineField({name:'publishedAt',type:'datetime',initialValue:()=>new Date().toISOString()}),
 ],preview:{select:{title:'title',subtitle:'status',media:'cover'}}});
const config=defineConfig({name:'default',title:'PhoenixR3born · Owner Studio',projectId,dataset,basePath:'/studio',plugins:[structureTool()],schema:{types:[resource]}});
export function mountStudio(){document.title='Owner Studio | PhoenixR3born';document.documentElement.style.colorScheme='light';createRoot(document.getElementById('root')).render(<div style={{position:'fixed',inset:0,background:'#fff'}}><Studio config={config}/></div>)}
