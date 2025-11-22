import { memo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { NodeStatistic } from '../types';
import './StatisticsCharts.css';

interface StatisticsChartsProps {
  nodeStats: NodeStatistic[];
  isLoading: boolean;
}

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
};

const arePropsEqual = (
  prevProps: StatisticsChartsProps,
  nextProps: StatisticsChartsProps
): boolean => {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.nodeStats.length !== nextProps.nodeStats.length) return false;
  
  // Deep comparison of nodeStats array
  for (let i = 0; i < prevProps.nodeStats.length; i++) {
    const prev = prevProps.nodeStats[i];
    const next = nextProps.nodeStats[i];
    if (
      prev.label !== next.label ||
      prev.count !== next.count ||
      prev.color !== next.color ||
      prev.percentage !== next.percentage
    ) {
      return false;
    }
  }
  
  return true;
};

const StatisticsChartsComponent = ({ nodeStats, isLoading }: StatisticsChartsProps) => {
  if (isLoading) {
    return (
      <div className="statistics-charts loading">
        <div className="chart-skeleton">Loading charts...</div>
      </div>
    );
  }

  if (nodeStats.length === 0) {
    return (
      <div className="statistics-charts empty">
        <p>No data available to display charts</p>
      </div>
    );
  }

  const sortedStats = [...nodeStats]
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  const barChartData = sortedStats.map(stat => ({
    name: stat.label,
    count: stat.count,
    color: stat.color,
  }));

  const top10Stats = [...nodeStats]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  const otherStats = nodeStats.slice(10);
  const otherCount = otherStats.reduce((sum, stat) => sum + stat.count, 0);
  
  const pieChartData = top10Stats.map(stat => ({
    name: stat.label,
    value: stat.count,
    percentage: stat.percentage,
    color: stat.color,
  }));
  
  if (otherCount > 0) {
    const totalNodes = nodeStats.reduce((sum, stat) => sum + stat.count, 0);
    pieChartData.push({
      name: 'Other',
      value: otherCount,
      percentage: (otherCount / totalNodes) * 100,
      color: '#95a5a6',
    });
  }

  return (
    <div 
      className="statistics-charts"
      role="region"
      aria-label="Statistics charts"
    >
      <div className="chart-container">
        <h3 id="bar-chart-title">Node Type Distribution (Bar Chart)</h3>
        <div 
          role="img" 
          aria-labelledby="bar-chart-title"
          aria-describedby="bar-chart-desc"
        >
          <span id="bar-chart-desc" className="sr-only">
            Bar chart showing the distribution of {barChartData.length} node types by count. 
            {barChartData.length > 0 && `Top node type is ${barChartData[0].name} with ${barChartData[0].count.toLocaleString()} nodes.`}
          </span>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                tickFormatter={formatNumber}
                tick={{ fontSize: 12 }}
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number) => value.toLocaleString()}
                contentStyle={{ background: 'white', border: '1px solid #ccc' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {barChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="chart-container">
        <h3 id="pie-chart-title">Node Type Distribution (Pie Chart)</h3>
        <div 
          role="img" 
          aria-labelledby="pie-chart-title"
          aria-describedby="pie-chart-desc"
        >
          <span id="pie-chart-desc" className="sr-only">
            Pie chart showing the proportional distribution of top {pieChartData.length} node types. 
            {pieChartData.length > 0 && `${pieChartData[0].name} represents ${pieChartData[0].percentage.toFixed(1)}% of all nodes.`}
          </span>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => {
                  const item = pieChartData[entry.index];
                  return `${item.name} (${item.percentage.toFixed(1)}%)`;
                }}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => value.toLocaleString()}
                contentStyle={{ background: 'white', border: '1px solid #ccc' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => value}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export const StatisticsCharts = memo(StatisticsChartsComponent, arePropsEqual);

StatisticsCharts.displayName = 'StatisticsCharts';
