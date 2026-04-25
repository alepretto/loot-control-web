import {
	Chart as ChartJS,
	LineController,
	DoughnutController,
	CategoryScale,
	LinearScale,
	TimeScale,
	PointElement,
	LineElement,
	ArcElement,
	Title,
	Tooltip,
	Legend,
	Filler
} from 'chart.js';

ChartJS.register(
	LineController,
	DoughnutController,
	CategoryScale,
	LinearScale,
	TimeScale,
	PointElement,
	LineElement,
	ArcElement,
	Title,
	Tooltip,
	Legend,
	Filler
);

export { ChartJS };
