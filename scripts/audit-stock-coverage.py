#!/usr/bin/env python3
"""Read-only local coverage audit. No credentials or provider requests."""
import argparse
import datetime as dt
import json
import sqlite3
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--db', type=Path, required=True)
parser.add_argument('--symbols', default='ADBE,AAPL,MSFT,NVDA,BRK.B,BABA,TSLA,JPM,XOM,KO')
args = parser.parse_args()
if not args.db.is_file():
    parser.error('database does not exist')
con = sqlite3.connect(args.db.resolve().as_uri() + '?mode=ro', uri=True)
con.row_factory = sqlite3.Row
# One consistent read view while background workers keep collecting.
con.execute('BEGIN')
config = json.loads(con.execute('SELECT config_json FROM research_config WHERE singleton=1').fetchone()[0])
symbols = [r[0] for r in con.execute('SELECT DISTINCT UPPER(l.source_symbol) FROM directory_head h JOIN directory_memberships m ON m.snapshot_id=h.snapshot_id JOIN listings l ON l.id=m.listing_id WHERE m.etf=0 AND m.test=0')]
aliases = dict(con.execute('SELECT symbol,cik FROM research_aliases'))
heads = {(r['dataset'], r['subject']): dict(r) for r in con.execute('SELECT h.dataset,h.subject,s.provider,s.fetched_at FROM research_heads h JOIN research_snapshots s ON s.id=h.snapshot_id')}
jobs = {(r['provider'], r['dataset'], r['subject']): dict(r) for r in con.execute("SELECT provider,dataset,subject,state,error,last_success FROM research_jobs WHERE state!='retired' ORDER BY id")}
latest = dict(con.execute("SELECT symbol,MAX(date) FROM daily_bars WHERE provider=? GROUP BY symbol", (config.get('priceSource', 'yahoo'),)))
newest = max(latest.values(), default=None)
def provider(dataset):
    return config.get({'prices':'priceSource','profile':'profileSource','facts':'factsSource','filings':'filingsSource','funds':'fundsSource','analyst':'analystSource','politicians':'politiciansSource'}.get(dataset,''), {'insiders':'sec','news':'fmp','politicians':'fmp'}.get(dataset,'yahoo'))
def cell(symbol, dataset):
    p = provider(dataset)
    subject = 'cik:' + aliases.get(symbol,'') if p=='sec' else symbol
    head = heads.get((dataset,subject))
    if head and (head['provider']==p or head['provider']=='nasdaq' and p=='yahoo' and dataset in ('profile','analyst')):
        return {'state':'stored','provider':head['provider'],'fetchedAt':head['fetched_at']}
    job=jobs.get((p,dataset,subject),{})
    return {'state':job.get('state','unmapped' if p=='sec' and not aliases.get(symbol) else 'pending'), 'error':job.get('error','')}
coverage=[]
for dataset,settings in config['datasets'].items():
    if dataset=='actions': continue  # shared market snapshot, not company coverage
    states={}
    for symbol in symbols:
        state=cell(symbol,dataset)['state'];states[state]=states.get(state,0)+1
    coverage.append({'dataset':dataset,'provider':provider(dataset),'enabled':settings['enabled'],'total':len(symbols), **states})
samples={symbol:{'latestPriceDate':latest.get(symbol),'datasets':{r['dataset']:cell(symbol,r['dataset']) for r in coverage if r['enabled']}} for symbol in args.symbols.upper().split(',') if symbol in symbols}
errors=[dict(r) for r in con.execute("SELECT provider,dataset,error,count(*) count FROM research_jobs WHERE state IN ('failed','blocked') GROUP BY provider,dataset,error ORDER BY count(*) DESC LIMIT 20")]
print(json.dumps({'auditedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'universe':len(symbols),'coverage':coverage,'newestStoredPriceDate':newest,'pricesOlderThanNewestStoredSession':sum(d<newest for d in latest.values()) if newest else 0,'samples':samples,'errors':errors},indent=2))
con.rollback()
con.close()
