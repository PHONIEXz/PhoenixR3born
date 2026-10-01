import React,{useState} from 'react';
import {db,result} from './community';

const redirect=path=>`${location.origin}${path}`;
function Notice({message}){return message?<p className="community-notice" role="status">{message}</p>:null;}
function Email({value,onChange}){return <label className="field"><span>Email address</span><input type="email" autoComplete="email" required maxLength={254} value={value} onChange={e=>onChange(e.target.value)}/></label>;}
function Password({label='Password',value,onChange,autoComplete='current-password'}){return <label className="field"><span>{label}</span><input type="password" autoComplete={autoComplete} required minLength={autoComplete==='new-password'?12:1} maxLength={128} value={value} onChange={e=>onChange(e.target.value)}/></label>;}

export default function AuthPage({path,user}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const signup=path==='/signup',forgot=path==='/forgot-password',reset=path==='/reset-password';
 async function submit(e){e.preventDefault();setBusy(true);setMessage('');try{
   if(signup){
     if(password!==repeat) throw new Error('Passwords do not match.');
     await result(db.auth.signUp({email,password,options:{emailRedirectTo:redirect('/account')}}));
     setMessage('Check your email for the verification link. It will bring you back to your account after verification.');
   }else if(forgot){
     await result(db.auth.resetPasswordForEmail(email,{redirectTo:redirect('/reset-password')}));
     setMessage('If this email has an account, a reset link is on its way.');
   }else if(reset){
     if(!user) throw new Error('Open the password reset link from your email first.');
     if(password!==repeat) throw new Error('Passwords do not match.');
     await result(db.auth.updateUser({password}));
     await result(db.auth.signOut({scope:'global'}));
     setMessage('Password updated. Sign in with your new password.');setPassword('');setRepeat('');
   }else{
     await result(db.auth.signInWithPassword({email,password}));
     location.assign('/account');
   }
 }catch(error){setMessage(signup?'Could not complete sign-up. Check your details or try another email.':error.message);}finally{setBusy(false);}}
 async function emailLink(){setBusy(true);setMessage('');try{
   if(!email) throw new Error('Enter your email address first.');
   await result(db.auth.signInWithOtp({email,options:{emailRedirectTo:redirect('/account'),shouldCreateUser:false}}));
   setMessage('If this email has an account, check your inbox for a sign-in link.');
 }catch(error){setMessage(error.message);}finally{setBusy(false);}}
 const title=signup?'Create your P3 account.':forgot?'Reset your password.':reset?'Choose a new password.':'Welcome back.';
 return <section className="auth-layout"><div className="auth-intro"><span className="eyebrow">P3 / YOUR SPACE</span><h1>{title}</h1><p className="intro">{signup?'Verify your email before you share projects, files, and ideas.':forgot?'We will send a private link to the email on your account.':reset?'Use a unique password you have not used elsewhere.':'Sign in to manage your profile and resources.'}</p><div className="auth-steps"><span>01 / Your account</span><span>02 / Your profile</span><span>03 / Share and review</span></div></div><div>
  <form className="community-form auth-form" onSubmit={submit}>
   {!reset?<Email value={email} onChange={setEmail}/>:null}
   {!forgot?<Password label={reset?'New password':'Password'} value={password} onChange={setPassword} autoComplete={signup||reset?'new-password':'current-password'}/>:null}
   {signup||reset?<Password label="Confirm password" value={repeat} onChange={setRepeat} autoComplete="new-password"/>:null}
   {signup||reset?<small>Use at least 12 characters. A password manager can create a unique one.</small>:null}
   <button className="button" disabled={busy||reset&&!user}>{busy?'Please wait…':signup?'Create account':forgot?'Send reset link':reset?'Save new password':'Log in'}</button>
   {reset&&!user?<small>Open the reset link in your email to continue.</small>:null}
   <Notice message={message}/>
  </form>
  {!signup&&!forgot&&!reset?<div className="auth-alt"><button className="secondary-button" disabled={busy||!email} onClick={emailLink}>Email me a sign-in link</button><p>Already used P3 without a password? Enter your email above and use this link.</p></div>:null}
  <nav className="auth-links" aria-label="Account help">{!signup?<a href="/signup">Create an account</a>:<a href="/login">Already have an account?</a>}{!forgot&&!reset?<a href="/forgot-password">Forgot password?</a>:<a href="/login">Back to login</a>}</nav>
 </div></section>;
}
