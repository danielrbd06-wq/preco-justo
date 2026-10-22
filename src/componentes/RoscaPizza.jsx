/* Só o desenho da rosca do preço. Fica em arquivo próprio para a biblioteca de
   gráficos chegar sob demanda (Bloco 21): a legenda ao lado aparece na hora. */
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

export default function RoscaPizza({ dados }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={dados} dataKey="value" nameKey="name" innerRadius={30} outerRadius={52} paddingAngle={2} stroke="none">
          {dados.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
