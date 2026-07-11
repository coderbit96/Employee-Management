const stars = [
  "left-[8%] top-[18%]",
  "left-[18%] top-[32%]",
  "left-[28%] top-[14%]",
  "left-[42%] top-[28%]",
  "left-[54%] top-[12%]",
  "left-[68%] top-[24%]",
  "left-[82%] top-[16%]",
  "left-[88%] top-[44%]",
  "left-[74%] top-[62%]",
  "left-[58%] top-[52%]",
  "left-[44%] top-[72%]",
  "left-[24%] top-[66%]",
  "left-[12%] top-[82%]",
  "left-[36%] top-[44%]",
  "left-[64%] top-[82%]",
];

export function ConstellationBackground() {
  return (
    <div className="constellation-bg" aria-hidden="true">
      <div className="constellation-orbit constellation-orbit-one" />
      <div className="constellation-orbit constellation-orbit-two" />
      {stars.map((position, index) => (
        <span
          key={`${position}-${index}`}
          className={`constellation-star ${position}`}
          style={{ animationDelay: `${index * 0.28}s` }}
        />
      ))}
    </div>
  );
}
