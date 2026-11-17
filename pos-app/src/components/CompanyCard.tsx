import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CompanyCardProps = {
  name?: string;
  logoPath?: string; // path under public/, e.g. '/company-logo.png'
  location?: string;
};

export const CompanyCard = ({ name = "Company", logoPath, location = "Unknown" }: CompanyCardProps) => {
  const src = "/public/SAND_logo.webp"; // default logo if none provided

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/40 hover:-translate-y-1 cursor-pointer bg-gradient-to-br from-card to-card/50">
      <CardHeader className="pb-2 pt-2 px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-balance leading-tight">
              {"S & J Marketing"}
            </CardTitle>
            <CardContent className="p-0 mt-2 text-sm text-muted-foreground flex items-center gap-2">
              <svg
                className="w-4 h-4 shrink-0 opacity-60"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="line-clamp-1">{location}</span>
            </CardContent>
          </div>
          <div className="h-14 w-14 rounded-lg bg-muted/50 p-2 shrink-0 flex items-center justify-center">
            <img
              src={src}
              alt={`${name} logo`}
              className="h-full w-full object-contain opacity-90"
            />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};

export default CompanyCard;
