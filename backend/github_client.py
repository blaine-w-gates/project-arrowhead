import os
import requests

GITHUB_API = 'https://api.github.com'

class GitHubClient:
    """Minimal GitHub REST client using a server-side PAT.

    Reads token from the environment variable `GITHUB_SERVER_TOKEN`.
    Never expose this token to the client.
    """

    def __init__(self, token: str | None = None):
        self.token = token or os.environ.get('GITHUB_SERVER_TOKEN')
        if not self.token:
            raise RuntimeError('Missing GITHUB_SERVER_TOKEN')
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.token}',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'project-arrowhead-backend'
        })

    def get_user(self):
        """Return authenticated user JSON and granted scopes header."""
        resp = self.session.get(f'{GITHUB_API}/user', timeout=10)
        resp.raise_for_status()
        return resp.json(), resp.headers.get('X-OAuth-Scopes', '')

    def get_repo(self, repo_full_name: str):
        """Return repo JSON for owner/repo."""
        resp = self.session.get(f'{GITHUB_API}/repos/{repo_full_name}', timeout=10)
        resp.raise_for_status()
        return resp.json()
