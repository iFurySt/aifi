package command

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/ifuryst/aifi/apps/cli/internal/directory"
	"github.com/ifuryst/aifi/apps/cli/internal/store"
	"github.com/spf13/cobra"
	"os"
	"path/filepath"
)

func New() *cobra.Command {
	var dataDir string
	root := &cobra.Command{Use: "aifi", Short: "Local AIFi data tools", SilenceUsage: true, SilenceErrors: true}
	root.PersistentFlags().StringVar(&dataDir, "data-dir", os.Getenv("AIFI_DATA_DIR"), "Local data directory (default: OS config directory/aifi/data)")
	data := &cobra.Command{Use: "data", Short: "Collect and inspect local datasets"}
	dir := &cobra.Command{Use: "directory", Short: "Official US-listed security directory"}
	root.AddCommand(data)
	data.AddCommand(dir)
	withStore := func(cmd *cobra.Command, action func(context.Context, *store.Store) (any, error)) error {
		path := dataDir
		if path == "" {
			base, err := os.UserConfigDir()
			if err != nil {
				return err
			}
			path = filepath.Join(base, "aifi", "data")
		}
		db, err := store.Open(cmd.Context(), path)
		if err != nil {
			return err
		}
		defer db.Close()
		value, err := action(cmd.Context(), db)
		if err != nil {
			return err
		}
		encoder := json.NewEncoder(cmd.OutOrStdout())
		encoder.SetIndent("", "  ")
		return encoder.Encode(value)
	}
	sync := &cobra.Command{Use: "sync", Short: "Fetch both official files and atomically update SQLite", Args: cobra.NoArgs, RunE: func(cmd *cobra.Command, _ []string) error {
		return withStore(cmd, func(ctx context.Context, s *store.Store) (any, error) { return s.Sync(ctx, directory.NewClient()) })
	}}
	status := &cobra.Command{Use: "status", Short: "Read source provenance and recent sync outcomes", Args: cobra.NoArgs, RunE: func(cmd *cobra.Command, _ []string) error {
		return withStore(cmd, func(ctx context.Context, s *store.Store) (any, error) { return s.Status(ctx) })
	}}
	var query, scope string
	var limit, offset int
	list := &cobra.Command{Use: "list", Short: "Search the cached directory without network calls", Args: cobra.NoArgs, RunE: func(cmd *cobra.Command, _ []string) error {
		if scope != "candidates" && scope != "all" {
			return fmt.Errorf("scope must be candidates or all")
		}
		return withStore(cmd, func(ctx context.Context, s *store.Store) (any, error) {
			return s.List(ctx, query, limit, offset, scope == "all")
		})
	}}
	list.Flags().StringVar(&query, "query", "", "Literal symbol or name search")
	list.Flags().StringVar(&scope, "scope", "candidates", "candidates excludes test issues and ETFs; all includes every source row")
	list.Flags().IntVar(&limit, "limit", 20, "Page size (1–200)")
	list.Flags().IntVar(&offset, "offset", 0, "Offset (0–100000)")
	dir.AddCommand(sync, list, status)
	return root
}
