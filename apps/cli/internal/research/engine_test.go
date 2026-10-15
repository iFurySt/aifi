package research

import (
 "context"
 "crypto/aes"
 "crypto/cipher"
 "encoding/base64"
 "os"
 "path/filepath"
 "testing"
 "time"

 "github.com/ifuryst/aifi/apps/cli/internal/directory"
 "github.com/ifuryst/aifi/apps/cli/internal/market"
 "github.com/ifuryst/aifi/apps/cli/internal/store"
)
func TestUniverseJobsAndReconcileAfterMapping(t *testing.T){
 ctx:=context.Background();path:=t.TempDir();db,e:=store.Open(ctx,path);if e!=nil{t.Fatal(e)};defer db.Close()
 first,_:=directory.Parse("nasdaqlisted",[]byte("Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares\nAAPL|Apple|Q|N|N|100|N|N\nUNKNOWN|Unknown issuer|Q|N|N|100|N|N\nFile Creation Time: 1014202621:31|||||||\n"))
 second,_:=directory.Parse("otherlisted",[]byte("ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol\nCLASS.B|Class B|N|CLASS.B|N|100|N|CLASS/B\nFile Creation Time: 1014202621:31||||||\n"))
 first.URL="https://www.nasdaqtrader.com/first";second.URL="https://www.nasdaqtrader.com/second";first.FetchedAt=time.Now();second.FetchedAt=time.Now()
 run,e:=db.Start(ctx,time.Now());if e!=nil{t.Fatal(e)};if _,e=db.Commit(ctx,run,[]directory.File{first,second},time.Now());e!=nil{t.Fatal(e)}
 engine:=New(db,path,false);if e=engine.Reconcile(ctx,true);e!=nil{t.Fatal(e)};status,e:=db.ResearchStatus(ctx);if e!=nil||status.Universe!=3{t.Fatal(status,e)}
 for _,d:=range []string{"profile","actions","funds","politicians","analyst","news"}{found:=false;for _,p:=range status.Progress{if p.Dataset==d {found=true;if p.Total!=3{t.Fatalf("%s not all-directory: %+v",d,p)}}};if !found{t.Fatal("missing jobs",d)}}
 j,e:=db.ClaimResearchJob(ctx,"sec",[]string{"identity"},false,time.Now());if e!=nil||j==nil{t.Fatal(e)}
 r:=market.Result{Aliases:map[string]string{"AAPL":"0000320193"},Payload:market.Payload{Complete:true},Evidence:[]market.Evidence{{URL:"https://www.sec.gov/map",Body:[]byte(`{"original":true}`),FetchedAt:time.Now()}}};if e=db.FinishResearchJob(ctx,*j,r,time.Now(),time.Now().Add(time.Hour));e!=nil{t.Fatal(e)}
 if e=engine.Reconcile(ctx,false);e!=nil{t.Fatal(e)};status,_=db.ResearchStatus(ctx);for _,p:=range status.Progress{if p.Dataset=="facts"&&p.Total!=1{t.Fatal("issuer jobs not mapped",p)}}
 if e=engine.Reconcile(ctx,true);e!=nil{t.Fatal(e)};again,_:=db.ResearchStatus(ctx);if len(status.Progress)!=len(again.Progress){t.Fatal("duplicate jobs")}
 // Missing keys never start provider requests or consume thousands of jobs.
 engine.Client.Key=func(context.Context,string)(map[string]string,error){return map[string]string{},nil};worked,e:=engine.Step(ctx,"massive");if e!=nil||worked{t.Fatal("unconfigured provider ran")}
}
func TestVaultNodeCompatibleGCMAndTamper(t *testing.T){
 ctx:=context.Background();path:=t.TempDir();db,e:=store.Open(ctx,path);if e!=nil{t.Fatal(e)};defer db.Close();key:=make([]byte,32);nonce:=make([]byte,12);os.WriteFile(filepath.Join(path,"aifi-vault.key"),key,0600)
 block,_:=aes.NewCipher(key);gcm,_:=cipher.NewGCM(block);sealed:=gcm.Seal(nil,nonce,[]byte("private"),nil);raw:=append(append(append([]byte{},nonce...),sealed[len(sealed)-16:]...),sealed[:len(sealed)-16]...)
 db.PutCredentials(ctx,"massive",map[string]string{"apiKey":"v1:"+base64.StdEncoding.EncodeToString(raw)})
 engine:=New(db,path,false);keys,e:=engine.Client.Key(ctx,"massive");if e!=nil||keys["apiKey"]!="private"{t.Fatal("Node GCM format mismatch",e)}
 raw[len(raw)-1]^=1;db.PutCredentials(ctx,"massive",map[string]string{"apiKey":"v1:"+base64.StdEncoding.EncodeToString(raw)});if _,e=engine.Client.Key(ctx,"massive");e==nil{t.Fatal("tampered key decrypted")}
}
