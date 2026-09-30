import React from 'react';
import {createRoot} from 'react-dom/client';
import {Studio,defineConfig,defineType,defineField} from 'sanity';
import {structureTool} from 'sanity/structure';
import {projectId,dataset} from './config';
const resource=defineType({name:'resource',title:'Collection item',type:'document',fields:[
 defineField({name:'title',type:'string',validation:r=>r.required().max(100)}),
 defineField({name:'slug',type:'slug',options:{source:'title',maxLength:96},validation:r=>r.required()}),
 defineField({name:'category',type:'string',options:{list:['Projects','Tools','Learning','Downloads','Recommendations','Other']},initialValue:'Other',validation:r=>r.required()}),
 defineField({name:'summary',title:'Short introduction',type:'text',rows:3,description:'Tell visitors what this is and why they might need it.',validation:r=>r.required().max(280)}),
 defineField({name:'description',title:'Your explanation',type:'text',rows:10,description:'Write your recommendation, instructions, or notes. Paragraphs appear on the item page.'}),
 defineField({name:'cover',title:'Cover image',type:'image',options:{hotspot:true}}),
 defineField({name:'link',title:'Destination link',type:'url',validation:r=>r.uri({scheme:['http','https']})}),
 defineField({name:'label',title:'Link button text',type:'string',initialValue:'Check it out'}),
 defineField({name:'files',title:'Downloadable files',type:'array',description:'Documents, images, audio, video, archives and other files. File sizes are subject to Sanity plan limits. Use external links for large files.',of:[{type:'file',fields:[{name:'label',title:'Download label',type:'string'}]}]}),
 defineField({name:'featured',title:'Phoenix’s pick',type:'boolean',initialValue:false}),
 defineField({name:'publishedAt',type:'datetime',initialValue:()=>new Date().toISOString()}),
 ],preview:{select:{title:'title',subtitle:'category',media:'cover'}}});
const config=defineConfig({name:'default',title:'PhoenixR3born · Owner Studio',projectId,dataset,basePath:'/studio',plugins:[structureTool()],schema:{types:[resource]}});
export function mountStudio(){document.title='Owner Studio | PhoenixR3born';document.documentElement.style.colorScheme='light';createRoot(document.getElementById('root')).render(<div style={{position:'fixed',inset:0,background:'#fff'}}><Studio config={config}/></div>)}
