// RepoPage.jsx
import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './RepoPage.css';

// Register chart components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function RepoPage() {
  const { id } = useParams();
  const { state: repo } = useLocation(); // The entire repo object passed from HomePage

  // In a real app, you might also fetch the data again if needed:
  // useEffect(() => {
  //   fetch(`/api/repos/${id}`)
  //     .then(res => res.json())
  //     .then(data => setRepoDetails(data));
  // }, [id]);

  // Example chart data
  const prReviewedData = {
    labels: ['2025-03-14', '2025-03-15', '2025-03-16', '2025-03-17'],
    datasets: [
      {
        label: 'PRs Reviewed',
        data: [0, 1, 0, 2],
        fill: false,
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      }
    ]
  };

  const codeSuggestionsData = {
    labels: ['2025-03-14', '2025-03-15', '2025-03-16', '2025-03-17'],
    datasets: [
      {
        label: 'Code Suggestions',
        data: [1, 0, 2, 1],
        fill: false,
        borderColor: 'rgb(54, 162, 235)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true },
      title: { display: false }
    },
    scales: {
      x: {
        ticks: { color: '#ccc' },
        grid: { color: '#333' }
      },
      y: {
        ticks: { color: '#ccc' },
        grid: { color: '#333' }
      }
    }
  };

  return (
    <div className="repo-page">
      {/* Simple top section showing repo details */}
      <div className="repo-details-header">
        <h2>{repo?.name || 'Repo Name'}</h2>
        <p><strong>Owner:</strong> {repo?.owner}</p>
        <p><strong>Description:</strong> {repo?.description}</p>
      </div>

      {/* Statistics or cards (example placeholders) */}
      <section className="stats-grid">
        <div className="stat-card">
          <h3>PRs Reviewed</h3>
          <p>Last 7 days: 3</p>
        </div>
        <div className="stat-card">
          <h3>Secrets Detected</h3>
          <p>Last 7 days: 0</p>
        </div>
        {/* Add more cards as needed */}
      </section>

      {/* Charts */}
      <section className="charts-section">
        <div className="chart-card">
          <h3>PRs Reviewed Over Time</h3>
          <Line data={prReviewedData} options={chartOptions} />
        </div>
        <div className="chart-card">
          <h3>Code Suggestions Over Time</h3>
          <Line data={codeSuggestionsData} options={chartOptions} />
        </div>
      </section>
    </div>
  );
}

export default RepoPage;
