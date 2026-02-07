import React from "react";

type Level = {
  name: string;
  piece: string;
  depth: string;
};

const levels: Level[] = [
  {
    name: "Beginner",
    piece: "public/images/bishop_white.png",
    depth: "translate-y-8 z-10 opacity-80",
  },
  {
    name: "Intermediate",
    piece: "public/images/tiny_knight_white.png",
    depth: "-translate-y-6 z-30",
  },
  {
    name: "Advanced",
    piece: "public/images/rook_white.png",
    depth: "-translate-y-6 z-30",
  },
  {
    name: "Master",
    piece: "public/images/queen_white.png",
    depth: "translate-y-8 z-10 opacity-80",
  },
];

const ExperienceSelect: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-white">
      <h1 className="text-4xl font-semibold mb-20">
        Choose your experience level
      </h1>

      <div className="flex gap-20">
        {levels.map((level) => (
          <div
            key={level.name}
            className={`group flex flex-col items-center transition-transform duration-300 hover:-translate-y-6 ${level.depth}`}
          >
 
            <img
              src={level.piece}
              alt={level.name}
              className="
                w-8 h-8
                object-contain
                transition-transform duration-300
                group-hover:scale-110
              "
            />

            <button
              type="button"
              onClick={() => console.log(level.name)}
              className="mt-4 text-base"
            >
              {level.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExperienceSelect;
