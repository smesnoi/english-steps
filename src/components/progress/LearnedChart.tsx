import { useElementWidth } from '@/hooks/useElementWidth';
import {
  chartX,
  chartY,
  niceAxis,
  pickLabelIndices,
  type ChartBox,
  type LearnedPoint,
} from '@/utils/progress';

const DAY_FORMAT = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' });

/** "2026-10-18" → "18 окт." */
function formatDay(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  return DAY_FORMAT.format(new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

/** Точки на линии рисуем, только если активных дней мало: иначе они сливаются в «бусы». */
const MAX_ACTIVE_DAYS_WITH_DOTS = 15;
const FONT_SIZE = 12;

interface LearnedChartProps {
  series: readonly LearnedPoint[];
}

/**
 * Area-график «выучено слов по дням» на чистом SVG.
 * Размеры считаются в реальных пикселях по ширине контейнера (useElementWidth),
 * поэтому подписи осей всегда читаемы, в том числе на телефоне.
 */
export function LearnedChart({ series }: LearnedChartProps) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const height = width < 480 ? 200 : 220;
  const box: ChartBox = { width, height, left: 36, right: 12, top: 12, bottom: 28 };

  const count = series.length;
  const axis = niceAxis(Math.max(0, ...series.map((point) => point.learned)));
  const baseY = chartY(0, axis.max, box);

  const coords = series.map((point, index) => ({
    point,
    x: chartX(index, count, box),
    y: chartY(point.learned, axis.max, box),
  }));
  const last = coords[coords.length - 1];
  const first = coords[0];

  const linePath = coords
    .map((c, index) => `${index === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    first && last
      ? `${linePath} L${last.x.toFixed(1)},${baseY.toFixed(1)} L${first.x.toFixed(1)},${baseY.toFixed(1)} Z`
      : '';

  const activeCount = series.filter((point) => point.active).length;
  const showDots = activeCount < MAX_ACTIVE_DAYS_WITH_DOTS;

  const labelIndices = pickLabelIndices(count, width < 480 ? 5 : 7);
  const spacing = count > 1 ? (width - box.left - box.right) / (count - 1) : 20;
  const hitRadius = Math.min(10, spacing / 2);

  return (
    <div ref={ref} className="w-full">
      {/* SVG только рисует: для скринридеров те же данные есть в таблице ниже */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        aria-hidden="true"
        className="block"
      >
        {/* Сетка и подписи оси Y */}
        {axis.ticks.map((tick) => {
          const y = chartY(tick, axis.max, box);
          return (
            <g key={tick}>
              <line
                x1={box.left}
                x2={width - box.right}
                y1={y}
                y2={y}
                strokeWidth={1}
                className="stroke-stone-200 dark:stroke-stone-800"
              />
              <text
                x={box.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={FONT_SIZE}
                className="fill-stone-500 dark:fill-stone-400"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Подписи оси X: первая выравнивается по левому краю, последняя по правому */}
        {labelIndices.map((index) => {
          const c = coords[index];
          if (!c) return null;
          const anchor =
            index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle';
          return (
            <text
              key={c.point.day}
              x={c.x}
              y={height - 8}
              textAnchor={anchor}
              fontSize={FONT_SIZE}
              className="fill-stone-500 dark:fill-stone-400"
            >
              {formatDay(c.point.day)}
            </text>
          );
        })}

        {/* Заливка и линия */}
        {areaPath !== '' && (
          <path d={areaPath} className="fill-teal-600/15 dark:fill-teal-400/20" />
        )}
        {linePath !== '' && (
          <path
            d={linePath}
            fill="none"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            className="stroke-teal-600 dark:stroke-teal-400"
          />
        )}

        {/* Точки на днях с занятиями (последний день отмечен маркером ниже) */}
        {showDots &&
          coords.slice(0, -1).map(({ point, x, y }) =>
            point.active ? (
              <circle
                key={point.day}
                cx={x}
                cy={y}
                r={3.5}
                className="fill-teal-600 dark:fill-teal-400"
              />
            ) : null,
          )}

        {/* Маркер «сейчас» */}
        {last && (
          <circle
            cx={last.x}
            cy={last.y}
            r={5}
            strokeWidth={2.5}
            className="fill-white stroke-teal-600 dark:fill-stone-900 dark:stroke-teal-400"
          />
        )}

        {/* Невидимые области наведения: нативная подсказка с датой и значением */}
        {coords.map(({ point, x, y }) => (
          <circle key={point.day} cx={x} cy={y} r={hitRadius} fill="transparent">
            <title>{`${formatDay(point.day)}: ${point.learned} выучено`}</title>
          </circle>
        ))}
      </svg>

      <table className="sr-only">
        <caption>Выучено слов по дням за последние {count} дней</caption>
        <thead>
          <tr>
            <th scope="col">Дата</th>
            <th scope="col">Выучено слов</th>
          </tr>
        </thead>
        <tbody>
          {series.map((point) => (
            <tr key={point.day}>
              <td>{formatDay(point.day)}</td>
              <td>{point.learned}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
