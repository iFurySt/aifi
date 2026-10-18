package market

import (
	"context"
	"encoding/binary"
	"os"
	"path/filepath"
	"testing"
)

func TestSECBulkDirectoryAcceptsOfficialZIP64ShapeAndBoundsHeaders(t *testing.T) {
	// Metadata measured from the official archive. A sparse local file verifies
	// its ZIP64 layout without generating a million fixture entries in every CI.
	const size int64 = 1569745741
	path := filepath.Join(t.TempDir(), "submissions.zip")
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	if err = f.Truncate(size); err != nil {
		t.Fatal(err)
	}
	var tail [98]byte
	copy(tail[:4], []byte{'P', 'K', 6, 6})
	binary.LittleEndian.PutUint64(tail[4:], 44)
	binary.LittleEndian.PutUint64(tail[24:], 994773)
	binary.LittleEndian.PutUint64(tail[32:], 994773)
	binary.LittleEndian.PutUint64(tail[40:], 87626405)
	binary.LittleEndian.PutUint64(tail[48:], 1482119238)
	copy(tail[56:], []byte{'P', 'K', 6, 7})
	binary.LittleEndian.PutUint64(tail[64:], uint64(size-98))
	binary.LittleEndian.PutUint32(tail[72:], 1)
	copy(tail[76:], []byte{'P', 'K', 5, 6})
	binary.LittleEndian.PutUint16(tail[84:], 65535)
	binary.LittleEndian.PutUint16(tail[86:], 65535)
	binary.LittleEndian.PutUint32(tail[88:], 87626405)
	binary.LittleEndian.PutUint32(tail[92:], 1482119238)
	if _, err = f.WriteAt(tail[:], size-98); err != nil {
		t.Fatal(err)
	}
	if err = validateSECBulkDirectory(path); err != nil {
		t.Fatal("legitimate ZIP64 directory rejected", err)
	}
	binary.LittleEndian.PutUint64(tail[24:], maxSECBulkMembers+1)
	binary.LittleEndian.PutUint64(tail[32:], maxSECBulkMembers+1)
	if _, err = f.WriteAt(tail[:], size-98); err != nil {
		t.Fatal(err)
	}
	if err = validateSECBulkDirectory(path); err == nil || err.Error() != "bulk_directory_too_large" {
		t.Fatal("entry bound not enforced before allocation", err)
	}
}

func TestSECBulkDownloadedSubmissionsOffline(t *testing.T) {
	path := os.Getenv("AIFI_SEC_BULK_ARCHIVE")
	if path == "" {
		t.Skip("optional real downloaded SEC archive verification")
	}
	url, _ := secBulkURL("filings")
	b := &SECBulk{URL: url}
	if err := b.open(path); err != nil {
		t.Fatal(err)
	}
	defer b.Close()
	c := NewClient()
	r, err := c.CollectSECBulk(context.Background(), Job{Provider: "sec", Dataset: "filings", Subject: "cik:0000320193"}, b)
	if err != nil || len(r.Payload.Filings) == 0 || r.Payload.Profile == nil || r.Payload.Profile.CIK != "0000320193" {
		t.Fatal("real submissions normalization", err)
	}
	t.Logf("validated %d company members, Apple filings %d", len(b.members), len(r.Payload.Filings))
}
