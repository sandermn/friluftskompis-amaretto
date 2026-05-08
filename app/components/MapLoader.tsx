"use client";

import dynamic from "next/dynamic";

const DntMap = dynamic(() => import("./DntMap"), { ssr: false });

export default function MapLoader() {
  return <DntMap />;
}
