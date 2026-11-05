"""Export Git metadata without reading file contents or calling an AI service."""
import argparse
import json
import subprocess
from pathlib import Path


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], stderr=subprocess.PIPE).decode('utf-8', errors='replace')


def snapshot(repo):
    git(repo, 'rev-parse', '--show-toplevel')
    try:
        head = git(repo, 'rev-parse', '--verify', 'HEAD').strip()
    except subprocess.CalledProcessError:
        head = 'unborn'
    raw = git(repo, 'status', '--porcelain=v1', '-z').split('\0')
    changes = []
    index = 0
    while index < len(raw) and raw[index]:
        entry = raw[index]
        change = {'status': entry[:2], 'path': entry[3:]}
        if 'R' in entry[:2] or 'C' in entry[:2]:
            index += 1
            change['original_path'] = raw[index]
        changes.append(change)
        index += 1
    return {'schema_version': 1, 'head': head, 'changes': changes}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', default='.')
    parser.add_argument('--output', default='SESSION.md')
    parser.add_argument('--format', choices=['markdown', 'json'], default='markdown')
    parser.add_argument('--notes', type=Path, help='Explicitly include this UTF-8 notes file')
    args = parser.parse_args(argv)
    try:
        data = snapshot(args.repo)
        encoded = json.dumps(data, indent=2, ensure_ascii=True).replace('`', '\\u0060')
        if args.format == 'json':
            if args.notes:
                parser.error('--notes is supported only for Markdown output')
            output = encoded + '\n'
        else:
            notes = args.notes.read_text(encoding='utf-8') if args.notes else 'Not recorded.'
            output = '# Coding session checkpoint\n\n## User notes (unverified)\n\n' + notes + '\n\n## Git metadata\n\n```json\n' + encoded + '\n```\n\n## Next steps\n\nNot recorded.\n'
        with open(args.output, 'x', encoding='utf-8') as target:
            target.write(output)
    except (OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, 'Checkpoint failed: ' + str(error) + '\n')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
