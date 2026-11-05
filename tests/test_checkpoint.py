import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('checkpoint', Path(__file__).parents[1] / 'cli/checkpoint.py')
checkpoint = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checkpoint)


class CheckpointTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.git('init')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'user.name', 'Test')

    def git(self, *args):
        return subprocess.run(['git', '-C', str(self.repo), *args], check=True, capture_output=True)

    def test_unborn_and_untracked_without_contents(self):
        (self.repo / 'private.txt').write_text('SECRET CONTENT', encoding='utf-8')
        data = checkpoint.snapshot(self.repo)
        self.assertEqual(data['head'], 'unborn')
        self.assertEqual(data['changes'], [{'status': '??', 'path': 'private.txt'}])
        self.assertNotIn('SECRET CONTENT', str(data))

    def test_staged_rename(self):
        (self.repo / 'old.txt').write_text('hello', encoding='utf-8')
        self.git('add', '.'); self.git('commit', '-m', 'fixture')
        self.git('mv', 'old.txt', 'new name.txt')
        self.assertEqual(checkpoint.snapshot(self.repo)['changes'][0], {'status':'R ', 'path':'new name.txt', 'original_path':'old.txt'})

    def test_export_does_not_overwrite(self):
        output = self.repo / 'checkpoint.json'
        args = ['--repo',str(self.repo),'--output',str(output),'--format','json']
        checkpoint.main(args)
        before = output.read_bytes()
        with self.assertRaises(SystemExit): checkpoint.main(args)
        self.assertEqual(output.read_bytes(), before)

    def test_non_repository_fails(self):
        with tempfile.TemporaryDirectory() as other:
            with self.assertRaises(subprocess.CalledProcessError): checkpoint.snapshot(other)
