const GITHUB_API = 'https://api.github.com'

const headers = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN ?? ''}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

export interface GitHubSummary {
  repo: string
  commits: number
  mergedPRs: number
  closedIssues: number
  lastCommitDate: string | null
  languages: string[]
  hasTests: boolean
  hasReadme: boolean
  summary: string
}

export async function getRepoSummary(
  repoSlug: string,
  since?: string
): Promise<GitHubSummary> {
  const sinceParam = since
    ? `?since=${since}`
    : `?since=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}`

  const [commitsRes, prsRes, issuesRes, repoRes] = await Promise.allSettled([
    fetch(`${GITHUB_API}/repos/${repoSlug}/commits${sinceParam}`, { headers }),
    fetch(`${GITHUB_API}/repos/${repoSlug}/pulls?state=closed&per_page=20`, { headers }),
    fetch(`${GITHUB_API}/repos/${repoSlug}/issues?state=closed&per_page=20`, { headers }),
    fetch(`${GITHUB_API}/repos/${repoSlug}`, { headers }),
  ])

  const commits = commitsRes.status === 'fulfilled' && commitsRes.value.ok
    ? await commitsRes.value.json() : []

  const prs = prsRes.status === 'fulfilled' && prsRes.value.ok
    ? await prsRes.value.json() : []

  const issues = issuesRes.status === 'fulfilled' && issuesRes.value.ok
    ? await issuesRes.value.json() : []

  const repo = repoRes.status === 'fulfilled' && repoRes.value.ok
    ? await repoRes.value.json() : {}

  const mergedPRs = Array.isArray(prs)
    ? prs.filter((pr: { merged_at: string | null }) => pr.merged_at !== null).length
    : 0

  const lastCommit = Array.isArray(commits) && commits.length > 0
    ? commits[0]?.commit?.author?.date ?? null
    : null

  const languages = repo.language ? [repo.language] : []
  const hasReadme = Boolean(repo.description || repo.homepage)

  const hasTests = Array.isArray(commits) && commits.some(
    (c: { commit: { message: string } }) =>
      c.commit?.message?.toLowerCase().includes('test')
  )

  const summary = `
  GitHub repo: ${repoSlug}
  Commits (last 30d): ${Array.isArray(commits) ? commits.length : 0}
  Merged PRs: ${mergedPRs}
  Closed issues: ${Array.isArray(issues) ? issues.length : 0}
  Last commit: ${lastCommit ?? 'unknown'}
  Primary language: ${languages[0] ?? 'unknown'}
  Has tests: ${hasTests}
  Stars: ${repo.stargazers_count ?? 0}
  `.trim()

  return {
    repo: repoSlug,
    commits: Array.isArray(commits) ? commits.length : 0,
    mergedPRs,
    closedIssues: Array.isArray(issues) ? issues.length : 0,
    lastCommitDate: lastCommit,
    languages,
    hasTests,
    hasReadme,
    summary,
  }
}