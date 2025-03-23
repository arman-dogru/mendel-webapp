// HomePage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

// Example mock data—replace with real data from your API or GitHub
const mockRepositories = [
  {
    id: 1,
    name: 'Github-Repo-Search',
    owner: 'arman-dogru',
    description: 'No description available',
    language: 'JavaScript',
    stars: 0,
    forks: 0,
    updatedAt: '3/3/2025',
    isPublic: true
  },
  {
    id: 2,
    name: 'Github-Repo-Search',
    owner: 'arman-dogru',
    description: 'A modern GitHub Dashboard Application...',
    language: 'JavaScript',
    stars: 0,
    forks: 0,
    updatedAt: '3/3/2025',
    isPublic: true
  },
  // ... (remaining repos)
];

function HomePage() {
  const [repositories, setRepositories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [languageFilter, setLanguageFilter] = useState('All Languages');
  const [sortBy, setSortBy] = useState('Last Updated');

  const navigate = useNavigate();

  // Fetch or set repositories on component mount
  useEffect(() => {
    // In a real app, you might fetch from an API:
    //   fetch('/api/repositories')
    //     .then(res => res.json())
    //     .then(data => setRepositories(data))
    //     .catch(err => console.error(err));
    //
    // Here, we just use mock data for demonstration.
    setRepositories(mockRepositories);
  }, []);

  /**
   * Filter and sort logic (simplified):
   */
  const filteredRepos = repositories
    .filter(repo => {
      if (languageFilter !== 'All Languages') {
        return repo.language === languageFilter;
      }
      return true;
    })
    .filter(repo => {
      const term = searchTerm.toLowerCase();
      return (
        repo.name.toLowerCase().includes(term) ||
        (repo.description && repo.description.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'Last Updated') {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      }
      if (sortBy === 'Name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  // Handler when user clicks a repo card
  const handleRepoClick = (repo) => {
    // Navigate to the /repo/:id route, passing the entire repo via location state
    navigate(`/repo/${repo.id}`, { state: repo });
  };

  return (
    <div className="homepage">
      <header className="homepage-header">
        <h2>MENDEL</h2>
      </header>

      <section className="homepage-content">
        <div className="filter-bar">
          <h1>Your Repositories</h1>
          <div className="filters">
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />

            <select
              value={languageFilter}
              onChange={e => setLanguageFilter(e.target.value)}
            >
              <option>All Languages</option>
              <option>JavaScript</option>
              <option>TypeScript</option>
              <option>Python</option>
              <option>Go</option>
              <option>Java</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option>Last Updated</option>
              <option>Name</option>
            </select>
          </div>
        </div>

        <div className="repo-grid">
          {filteredRepos.map(repo => (
            <div
              className="repo-card"
              key={repo.id}
              onClick={() => handleRepoClick(repo)}
            >
              <div className="repo-card-header">
                <div className="repo-name">{repo.name}</div>
                <div className="repo-owner">{repo.owner}</div>
              </div>
              <div className="repo-description">
                {repo.description || 'No description available'}
              </div>
              <div className="repo-meta">
                <span className="repo-language">{repo.language}</span>
                <span className="repo-stats">
                  ★ {repo.stars} | {repo.forks} forks
                </span>
              </div>
              <div className="repo-updated">Updated {repo.updatedAt}</div>
              {repo.isPublic ? (
                <span className="repo-badge public">public</span>
              ) : (
                <span className="repo-badge private">private</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
