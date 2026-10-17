//go:build darwin || linux

package market

import (
	"os"
	"syscall"
)

func lockSECBulk(file *os.File) error {
	return syscall.Flock(int(file.Fd()), syscall.LOCK_EX|syscall.LOCK_NB)
}
