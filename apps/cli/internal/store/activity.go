package store

import (
	"context"
	"errors"
	"time"
)

func (s *Store) RequestActivitySync(ctx context.Context, dataset string) error {
	if dataset != "politicians" && dataset != "insiders" && dataset != "analyst" {
		return errors.New("invalid activity dataset")
	}
	cfg, e := s.ResearchConfig(ctx)
	if e != nil {
		return e
	}
	_, e = s.db.ExecContext(ctx, "UPDATE research_jobs SET state='queued',manual=1,next_run=?,error='' WHERE dataset=? AND provider=? AND state NOT IN ('running','retired')", stamp(time.Now()), dataset, cfg.ProviderFor(dataset))
	return e
}

func (s *Store) BoundInsiderJobs(ctx context.Context, window string, now time.Time) error {
	_, e := s.db.ExecContext(ctx, "UPDATE research_jobs SET state='retired',manual=0 WHERE provider='sec' AND dataset='insiders' AND window!=? AND state!='running'", window)
	if e != nil {
		return e
	}
	_, e = s.db.ExecContext(ctx, "UPDATE research_jobs SET state='queued',next_run=? WHERE provider='sec' AND dataset='insiders' AND window=? AND state='retired'", stamp(now), window)
	return e
}
