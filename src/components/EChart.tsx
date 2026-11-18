import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface Props {
  option: echarts.EChartsOption;
  height?: number;
}

/** ECharts 包装组件：初始化 / 自适应尺寸 / option 更新 / 卸载释放 */
export default function EChart({ option, height = 360 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={ref} style={{ height, width: '100%' }} />;
}
