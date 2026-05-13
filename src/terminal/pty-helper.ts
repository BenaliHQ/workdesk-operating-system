// Python PTY helper. Mirrors the verbatim PTY_HELPER_PY inlined inside
// src/vendor/terminal/main.ts. Kept here as a runtime-importable string so
// the SHA-locked vendored file is never read at runtime (esbuild would
// otherwise pull all 2,103 LOC of vendored upstream into the bundle).
//
// If upstream changes the helper, re-sync this string and bump the
// vendored SHA in STATE.json after operator approval.

export const PTY_HELPER_PY = `\
"""PTY helper for workdesk-terminal. Wraps zsh in a real PTY with resize support."""
import os, select, signal, struct, fcntl, termios, pty

def main():
    cols = int(os.environ.get("VIN_TERM_COLS", "80"))
    rows = int(os.environ.get("VIN_TERM_ROWS", "24"))
    master, slave = pty.openpty()
    fcntl.ioctl(master, termios.TIOCSWINSZ,
                struct.pack("HHHH", rows, cols, 0, 0))
    pid = os.fork()
    if pid == 0:
        os.close(master)
        os.setsid()
        fcntl.ioctl(slave, termios.TIOCSCTTY, 0)
        os.dup2(slave, 0)
        os.dup2(slave, 1)
        os.dup2(slave, 2)
        if slave > 2:
            os.close(slave)
        os.execvp("/bin/zsh", ["/bin/zsh", "-i", "-l"])
    os.close(slave)
    def resize(c, r):
        fcntl.ioctl(master, termios.TIOCSWINSZ,
                    struct.pack("HHHH", r, c, 0, 0))
        os.kill(pid, signal.SIGWINCH)
    buf = b""
    SEQ_START = b"\\x1b]R;"
    SEQ_END = b"\\x07"
    try:
        while True:
            rlist, _, _ = select.select([0, master], [], [])
            if 0 in rlist:
                data = os.read(0, 4096)
                if not data:
                    break
                buf += data
                while SEQ_START in buf:
                    idx = buf.index(SEQ_START)
                    end = buf.find(SEQ_END, idx)
                    if end < 0:
                        if idx > 0:
                            os.write(master, buf[:idx])
                        buf = buf[idx:]
                        break
                    if idx > 0:
                        os.write(master, buf[:idx])
                    seq = buf[idx + len(SEQ_START):end]
                    buf = buf[end + 1:]
                    try:
                        parts = seq.split(b";")
                        if len(parts) == 2:
                            resize(int(parts[0]), int(parts[1]))
                    except (ValueError, IndexError):
                        pass
                else:
                    if buf:
                        os.write(master, buf)
                        buf = b""
            if master in rlist:
                try:
                    data = os.read(master, 4096)
                    if not data:
                        break
                    os.write(1, data)
                except OSError:
                    break
    except Exception:
        pass
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        os.waitpid(pid, 0)
    except ChildProcessError:
        pass

if __name__ == "__main__":
    main()
`;

export const RESIZE_SEQ_START = '\x1b]R;';
export const RESIZE_SEQ_END = '\x07';

export function buildResizeSequence(cols: number, rows: number): string {
  return `${RESIZE_SEQ_START}${cols};${rows}${RESIZE_SEQ_END}`;
}
