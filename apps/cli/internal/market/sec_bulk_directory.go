package market

import (
	"bytes"
	"encoding/binary"
	"os"
)

// The official submissions ZIP currently contains nearly one million entries,
// including historical submission shards. Bound its central directory before
// archive/zip allocates headers; a company-only 500,000-entry limit rejects it.
const maxSECBulkMembers = 1_250_000
const maxSECBulkDirectoryBytes = 128 << 20

func validateSECBulkDirectory(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return err
	}
	invalid := &Failure{Code: "invalid_bulk_archive"}
	if !info.Mode().IsRegular() || info.Size() < 22 || info.Size() > maxSECBulkBytes {
		return invalid
	}
	size := info.Size()
	tail := make([]byte, min(size, 65557))
	if _, err = f.ReadAt(tail, size-int64(len(tail))); err != nil {
		return invalid
	}
	i := bytes.LastIndex(tail, []byte{'P', 'K', 5, 6})
	if i < 0 || len(tail)-i < 22 {
		return invalid
	}
	end := tail[i:]
	u16, u32, u64 := binary.LittleEndian.Uint16, binary.LittleEndian.Uint32, binary.LittleEndian.Uint64
	if len(end) != 22+int(u16(end[20:])) || u16(end[4:]) != 0 || u16(end[6:]) != 0 || u16(end[8:]) != u16(end[10:]) {
		return invalid
	}
	count, centralSize, offset := uint64(u16(end[10:])), uint64(u32(end[12:])), uint64(u32(end[16:]))
	endOffset := size - int64(len(tail)) + int64(i)
	if count == 65535 || centralSize == 0xffffffff || offset == 0xffffffff {
		var locator [20]byte
		if endOffset < 20 {
			return invalid
		}
		if _, err = f.ReadAt(locator[:], endOffset-20); err != nil || !bytes.Equal(locator[:4], []byte{'P', 'K', 6, 7}) || u32(locator[4:]) != 0 || u32(locator[16:]) != 1 {
			return invalid
		}
		zip64Offset := u64(locator[8:])
		if zip64Offset > uint64(endOffset-20) || uint64(endOffset-20)-zip64Offset < 56 {
			return invalid
		}
		var record [56]byte
		if _, err = f.ReadAt(record[:], int64(zip64Offset)); err != nil || !bytes.Equal(record[:4], []byte{'P', 'K', 6, 6}) || u64(record[4:]) < 44 || u32(record[16:]) != 0 || u32(record[20:]) != 0 || u64(record[24:]) != u64(record[32:]) {
			return invalid
		}
		count, centralSize, offset = u64(record[32:]), u64(record[40:]), u64(record[48:])
		endOffset = int64(zip64Offset)
	}
	if count > maxSECBulkMembers || centralSize > maxSECBulkDirectoryBytes {
		return &Failure{Code: "bulk_directory_too_large"}
	}
	if count == 0 || centralSize < count*46 || offset > uint64(endOffset) || centralSize > uint64(endOffset)-offset {
		return invalid
	}
	return nil
}
