import React from "react";

type Level = {
  name: string;
  piece: string;
};

const levels: Level[] = [
  { name: "Beginner", piece: "public/images/tiny_bishop_white.png" },
  { name: "Intermediate", piece: "public/images/tiny_knight_white.png" },
  { name: "Advanced", piece: "public/images/tiny_rook_white.png" },
  { name: "Master", piece: "public/images/tiny_queen_white.png" },
];

const ExperienceSelect: React.FC = () => {
  return (
    <div className="container">
      <h1 className="title">Choose your experience level</h1>

      <div className="levels">
        {levels.map((level, index) => (
          <div
            key={level.name}
            className={`level ${
              index === 1 || index === 2 ? "front" : ""
            }`}
          >
            <img src={level.piece} alt={level.name} />
            <button onClick={() => console.log(level.name)}>
              {level.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExperienceSelect;
