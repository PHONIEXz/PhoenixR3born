import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import {loadItems, destinations, downloadUrl} from './config';
import './style.css';
const categories = ['All', 'Projects', 'Tools', 'Learning', 'Downloads', 'Recommendations', 'Other'];
function Mark() { return <span className="mark" aria-hidden="true">P<span>3</span></span>; }
function Status({item}) {
  if (item.category !== 'Projects') return null;
  return <span className={`status-badge ${item.status}`}>{item.status === 'completed' ? 'Completed' : 'In progress'}</span>;
}
function Destinations({item, compact = false}) {
  const links = destinations(item);
  return <div className={`actions ${compact ? 'compact' : ''}`}>{links.map((link, i) => <a key={link.url} className={i === 0 ? 'button' : 'secondary-button'} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}<span className="sr-only"> (opens in a new tab)</span></a>)}</div>;
}
function Card({item, index}) {
  return <article className={`card ${item.featured ? 'featured-card' : ''}`}>
    {item.cover ? <a className="card-cover" href={`/item/${item.slug}`} aria-label={`Read about ${item.title}`}><img src={item.cover} alt="" loading="lazy"/></a> : null}
    <div className="card-content"><div className="card-top"><span className="item-number">{String(index + 1).padStart(2, '0')}</span><span className="category-label">{item.category}</span><Status item={item}/></div>
      {item.featured ? <span className="pick-label">PHOENIX’S PICK</span> : null}
      <h3><a href={`/item/${item.slug}`}>{item.title}</a></h3><p>{item.summary}</p>
      <div className="card-bottom"><Destinations item={item} compact/><a className="text-link" href={`/item/${item.slug}`}>About this {item.category === 'Projects' ? 'project' : 'resource'}</a></div>
    </div>
  </article>;
}
function ErrorState({retry}) { return <div className="state" role="alert"><h3>Couldn’t load the collection.</h3><p>Please try again in a moment.</p><button className="secondary-button" onClick={retry}>Try again</button></div>; }
function Detail({item}) {
  const [copied, setCopied] = useState('');
  async function copy() { try { await navigator.clipboard.writeText(location.href); setCopied('Link copied.'); } catch { setCopied('Copy the address from your browser.'); } }
  return <><div className="detail-meta"><span className="eyebrow">{item.category}</span><Status item={item}/></div><h1>{item.title}</h1><p className="intro">{item.summary}</p><Destinations item={item}/>
    {item.cover ? <img className="detail-cover" src={item.cover} alt=""/> : null}
    <div className="description">{item.description.split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}</div>
    {item.files.length ? <section className="files"><h2>Downloads</h2><div className="file-list">{item.files.map(f => <a className="download" key={f._key || f.url} href={downloadUrl(f)} target="_blank" rel="noopener noreferrer"><span>{f.label || f.name || 'Download file'}</span>{f.size ? <small>{(f.size / 1048576).toFixed(1)} MB</small> : null}</a>)}</div></section> : null}
    <div className="share"><button className="secondary-button" onClick={copy}>Copy page link</button><span role="status">{copied}</span></div></>;
}
function App() {
  const [items, setItems] = useState([]), [state, setState] = useState('loading'), [category, setCategory] = useState('All'), [search, setSearch] = useState(''), [projectStatus, setProjectStatus] = useState('all'), [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; setState('loading'); loadItems().then(data => { if (active) { setItems(data); setState('ready'); } }).catch(() => { if (active) setState('error'); }); return () => { active = false; }; }, [attempt]);
  const path = location.pathname;
  const isDetail = path.startsWith('/item/');
  const slug = isDetail ? path.slice(6) : null;
  const selected = items.find(x => x.slug === slug);
  useEffect(() => { document.title = selected ? `${selected.title} | PhoenixR3born` : 'PhoenixR3born | The collection'; }, [selected]);
  const shown = items.filter(x => (category === 'All' || x.category === category) && (projectStatus === 'all' || (x.category === 'Projects' && x.status === projectStatus)) && `${x.title} ${x.summary} ${x.description}`.toLowerCase().includes(search.toLowerCase()));
  const projects = items.filter(x => x.category === 'Projects');
  return <><a className="skip" href="#main">Skip to content</a><header><a className="brand" href="/"><Mark/><span>Phoenix<span className="green">R3born</span><small>THE PERSONAL COLLECTION</small></span></a><nav aria-label="Main"><a href="/#collection">Collection</a><a href="https://github.com/PHONIEXz" target="_blank" rel="noopener noreferrer">GitHub</a></nav></header><main id="main">
    {isDetail ? <section className="detail"><a className="back" href="/">Back to collection</a>{state === 'loading' ? <p role="status">Loading this resource…</p> : state === 'error' ? <ErrorState retry={() => setAttempt(x => x + 1)}/> : selected ? <Detail item={selected}/> : <><h1>Resource not found.</h1><p>It may have been removed or the link may be incomplete.</p></>}</section> : path !== '/' ? <section className="detail"><h1>Page not found.</h1><a className="button" href="/">Back to collection</a></section> : <>
      <section className="hero"><div className="hero-copy"><span className="eyebrow">A COLLECTION BY PHOENIX</span><h1>Things I build.<br/><span className="green">Things you can use.</span></h1><p>Projects, useful resources, and discoveries from my work in tech and cybersecurity. See what’s ready, what’s taking shape, and where to find it.</p><a className="text-link" href="#collection">Browse the collection</a></div><aside className="index-note"><span className="eyebrow">ON THE DESK</span><p>Made with curiosity.<br/>Shared with purpose.</p><div className="collection-counts"><div><strong>{state === 'ready' ? projects.filter(x => x.status === 'completed').length : '…'}</strong><span>Completed projects</span></div><div><strong>{state === 'ready' ? projects.filter(x => x.status === 'in-progress').length : '…'}</strong><span>In progress</span></div></div><span className="index-signature">PhoenixR3born / Personal collection</span></aside></section>
      <section id="collection" className="collection"><div className="section-top"><div><span className="eyebrow">EXPLORE / {String(items.length).padStart(2, '0')}</span><h2>The collection.</h2></div><div className="search-controls"><label className="search"><span>Search the collection</span><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find something useful…"/></label><label className="status-filter"><span>Project status</span><select aria-label="Project status" value={projectStatus} onChange={e => setProjectStatus(e.target.value)}><option value="all">All statuses</option><option value="completed">Completed</option><option value="in-progress">In progress</option></select></label></div></div>
        <div className="filters" role="group" aria-label="Filter by category">{categories.map(c => <button aria-pressed={category === c} key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div>
        {state === 'loading' ? <p className="state" role="status">Loading the collection…</p> : state === 'error' ? <ErrorState retry={() => setAttempt(x => x + 1)}/> : shown.length ? <div className="grid">{shown.map((item, i) => <Card item={item} index={i} key={item._id}/>)}</div> : <div className="state"><h3>{items.length ? 'Nothing matches yet.' : 'Something good is coming.'}</h3><p>{items.length ? 'Try another category, status, or search.' : 'New resources will appear here when Phoenix publishes them.'}</p>{items.length ? <button className="secondary-button" onClick={() => { setCategory('All'); setSearch(''); setProjectStatus('all'); }}>Clear filters</button> : null}</div>}
      </section></>}
  </main><footer><a className="brand" href="/"><Mark/><span>PhoenixR3born</span></a><p>Built with curiosity. Shared with purpose.</p><a href="/studio">Owner studio</a><small>© {new Date().getFullYear()} PhoenixR3born</small></footer></>;
}
if (location.pathname === '/studio' || location.pathname.startsWith('/studio/')) {
  import('./studio.jsx').then(({mountStudio}) => mountStudio()).catch(() => { createRoot(document.getElementById('root')).render(<div className="state"><h1>Studio could not load.</h1><p>Check your connection and reload the page.</p><a href="/">Back to the collection</a></div>); });
} else createRoot(document.getElementById('root')).render(<App/>);
