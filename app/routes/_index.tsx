import type { MetaFunction } from "@remix-run/node";
import VehicleServiceApp from "../../src/App";

export const meta: MetaFunction = () => {
  return [
    { title: "Vehicle Service Record" },
    { name: "description", content: "Track vehicle maintenance and service history." },
  ];
};

export default function Index() {
  return <VehicleServiceApp />;
}
