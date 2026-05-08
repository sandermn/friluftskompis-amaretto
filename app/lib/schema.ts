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
  startTime: varchar("start_time", { length: 5 }),
  description: text("description").notNull().default(""),
  routeGeojson: json("route_geojson"),
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

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  tripId: varchar("trip_id", { length: 12 })
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  paidBy: varchar("paid_by", { length: 40 }).notNull(),
  description: varchar("description", { length: 100 }).notNull(),
  amountOre: integer("amount_ore").notNull(),
  // null = split among all participants at time of recording
  sharedBy: json("shared_by").$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  tripId: varchar("trip_id", { length: 12 })
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  authorName: varchar("author_name", { length: 40 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
