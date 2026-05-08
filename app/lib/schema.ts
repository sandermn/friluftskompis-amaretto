import {
  pgTable,
  serial,
  integer,
  json,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import type { PackingListResponse } from "../api/packing-list/route";

export const trips = pgTable("trips", {
  id: varchar("id", { length: 12 }).primaryKey(),
  adminToken: varchar("admin_token", { length: 24 }).notNull(),
  routeId: integer("route_id").notNull(),
  routeName: text("route_name").notNull(),
  routeDistanceKm: integer("route_distance_km"),
  routeVanskelighet: varchar("route_vanskelighet", { length: 20 }).notNull(),
  routeLat: text("route_lat").notNull(),
  routeLon: text("route_lon").notNull(),
  tripTitle: text("trip_title").notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  description: text("description").notNull().default(""),
  packingList: json("packing_list").$type<PackingListResponse>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const participants = pgTable("participants", {
  id: serial("id").primaryKey(),
  tripId: varchar("trip_id", { length: 12 })
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 40 }).notNull(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});
