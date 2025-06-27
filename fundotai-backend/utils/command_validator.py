# utils/command_validator.py
import shlex
import re
from .logger import logger

DANGEROUS_COMMANDS = {
    "rm", "rmdir", "del", "delete", "shred", "dd", "format", "fdisk",
    "sudo", "su", "passwd", "chmod", "chown", "chgrp", "mount", "umount",
    "kill", "killall", "pkill", "halt", "shutdown", "reboot", "init",
    "crontab", "at", "batch", "systemctl", "service", "iptables",
    "nc", "netcat", "telnet", "ssh", "scp", "rsync", "ftp", "sftp"
}

DANGEROUS_PATTERNS = [
    "--delete", "-delete", "--remove", "-remove", "--force", "-f",
    ">/dev/", "/dev/null", "/dev/zero", "/etc/", "/var/", "/usr/", "/root/",
    "$(", "`", "&&", "||", ";", "|", ">", ">>", "<", "<<",
    "rm ", "sudo ", "su ", "..", "../", "~/"
]

ALLOWED_COMMANDS = {
    "ls", "cat", "echo", "whoami", "pwd", "uname", "date", "uptime", "ps", "df",
    "head", "tail", "touch", "mkdir", "cp", "mv",
    "grep", "sed", "awk", "sort", "uniq", "wc",
    "python3", "node", "git", "gcc", "java", "npm", "pip",
    "curl", "wget", "ping", "nslookup",
    "tar", "zip", "unzip", "gzip"
}

COMMAND_DESCRIPTIONS = {
    "ls": "List directory contents",
    "cat": "Display file content",
    "echo": "Print text to terminal",
    "whoami": "Show current user",
    "pwd": "Show current directory",
    "uname": "System info",
    "date": "Show current date and time",
    "uptime": "How long the system has been running",
    "ps": "Display running processes",
    "df": "Disk usage info",
    "head": "Show beginning of a file",
    "tail": "Show end of a file",
    "touch": "Create empty file",
    "mkdir": "Create new directory",
    "cp": "Copy files and directories",
    "mv": "Move/rename files",
    "grep": "Search text using patterns",
    "sed": "Stream editor for text transformations",
    "awk": "Pattern scanning and processing",
    "sort": "Sort text lines",
    "uniq": "Filter unique lines",
    "wc": "Word, line, character count",
    "python3": "Run Python 3 code",
    "node": "Run JavaScript code",
    "git": "Version control tool",
    "gcc": "C compiler",
    "java": "Run Java programs",
    "npm": "JavaScript package manager",
    "pip": "Python package installer",
    "curl": "Fetch data from URLs",
    "wget": "Download files from web",
    "ping": "Check server reachability",
    "nslookup": "DNS lookup",
    "tar": "Archive files",
    "zip": "Compress files",
    "unzip": "Extract zip files",
    "gzip": "Compress/decompress files"
}

COMMAND_CATEGORIES = {
    "filesystem": {"ls", "touch", "mkdir", "cp", "mv", "cat", "head", "tail"},
    "system": {"whoami", "pwd", "uname", "uptime", "date", "df", "ps"},
    "text": {"grep", "sed", "awk", "sort", "uniq", "wc"},
    "devtools": {"git", "gcc", "java", "npm", "pip", "node", "python3"},
    "network": {"curl", "wget", "ping", "nslookup"},
    "archive": {"tar", "zip", "unzip", "gzip"},
}

def is_command_safe(command: str) -> tuple[bool, str]:
    try:
        command_parts = shlex.split(command.strip().lower())
        if not command_parts:
            return False, "No command provided"

        base_cmd = command_parts[0]

        if base_cmd in DANGEROUS_COMMANDS:
            return False, f"Command '{base_cmd}' is not allowed for security reasons"

        if base_cmd not in ALLOWED_COMMANDS:
            return False, f"Command '{base_cmd}' not in allowed list"

        full_command = command.lower()
        for pattern in DANGEROUS_PATTERNS:
            if re.search(re.escape(pattern), full_command):
                return False, f"Pattern '{pattern}' not allowed for security"

        if base_cmd in ["find", "grep"] and "-delete" in command:
            return False, "Delete operations not allowed"

        if base_cmd == "curl" and any(dangerous in command for dangerous in ["file://", "ftp://", "localhost", "127.0.0.1"]):
            return False, "Local file access not allowed"

        return True, "Command is safe"

    except Exception as e:
        logger.error(f"Command safety check error: {e}")
        return False, f"Command parsing error: {e}"
