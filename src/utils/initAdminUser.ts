// src/utils/initAdminUser.ts
import { supabase } from "./supabaseClient";

export const initAdminUser = async () => {
  try {
    const adminEmail = "admin@example.com"; // change to your admin email
    const adminPassword = "password123";    // change to a secure password

    // Check if admin user already exists
    const { data: existing, error: fetchError } = await supabase
      .from("users") // assuming you have a "users" table
      .select("*")
      .eq("email", adminEmail)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error checking admin user:", fetchError);
      return;
    }

    if (!existing) {
      // Insert admin user
      const { data, error } = await supabase.from("users").insert([
        {
          email: adminEmail,
          password: adminPassword,
          role: "admin",
        },
      ]);

      if (error) {
        console.error("Error creating admin user:", error);
      } else {
        console.log("Admin user created:", data);
      }
    } else {
      console.log("Admin user already exists.");
    }
  } catch (err) {
    console.error("initAdminUser error:", err);
  }
};
