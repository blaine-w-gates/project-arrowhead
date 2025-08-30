import os
from typing import Optional, Dict, Any

import requests


class GitHubClient:
    """Minimal GitHub REST client for workflow dispatch and status queries.

    Configuration precedence for owner/repo:
    1) Explicit constructor args
    2) GITHUB_OWNER + GITHUB_REPO
    3) GITHUB_REPOSITORY ("owner/repo")
    """

    def __init__(
        self,
        token: Optional[str] = None,
        owner: Optional[str] = None,
        repo: Optional[str] = None,
        session: Optional[requests.Session] = None,
    ) -> None:
        self._token = token or os.environ.get("GITHUB_SERVER_TOKEN")
        if not self._token:
            raise RuntimeError("GITHUB_SERVER_TOKEN is not set")

        if owner and repo:
            self.owner, self.repo = owner, repo
        else:
            env_owner, env_repo = os.environ.get("GITHUB_OWNER"), os.environ.get("GITHUB_REPO")
            if env_owner and env_repo:
                self.owner, self.repo = env_owner, env_repo
            else:
                full = os.environ.get("GITHUB_REPOSITORY")
                if full and "/" in full:
                    self.owner, self.repo = full.split("/", 1)
                else:
                    raise RuntimeError(
                        "GitHub repo not configured: set GITHUB_OWNER + GITHUB_REPO or GITHUB_REPOSITORY"
                    )

        self.base_url = "https://api.github.com"
        self.timeout = float(os.environ.get("GITHUB_HTTP_TIMEOUT", "10"))
        self.session = session or requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {self._token}",
                "Accept": "application/vnd.github+json",
                "User-Agent": "project-arrowhead-control/1.0",
            }
        )

    def dispatch_workflow(self, workflow_file: str, ref: str = "main") -> None:
        """Trigger a workflow_dispatch on the given workflow file.

        GitHub returns 204 No Content on success.
        """
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/actions/workflows/{workflow_file}/dispatches"
        resp = self.session.post(url, json={"ref": ref}, timeout=self.timeout)
        # Accept any 2xx (GitHub typically returns 204)
        if resp.status_code // 100 != 2:
            resp.raise_for_status()

    def get_latest_run(self, workflow_file: str) -> Dict[str, Any]:
        """Return a simplified dict for the latest run of the workflow."""
        url = f"{self.base_url}/repos/{self.owner}/{self.repo}/actions/workflows/{workflow_file}/runs"
        params = {"per_page": 1}
        resp = self.session.get(url, params=params, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()
        runs = data.get("workflow_runs") or data.get("runs") or []
        if not runs:
            return {
                "status": "unknown",
                "conclusion": None,
                "html_url": None,
                "id": None,
                "updated_at": None,
            }
        run = runs[0]
        return {
            "status": run.get("status"),
            "conclusion": run.get("conclusion"),
            "html_url": run.get("html_url"),
            "id": run.get("id") or run.get("run_id"),
            "updated_at": run.get("updated_at") or run.get("created_at"),
        }
