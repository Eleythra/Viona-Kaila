import { Router } from "express";
import { createGuestRequest } from "./guest-requests.service.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const result = await createGuestRequest(req.body || {});
    return res.status(201).json({
      ok: true,
      id: String(result.id),
      bucket: result.bucket,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error?.message || "guest_request_create_failed",
    });
  }
});

export default router;
