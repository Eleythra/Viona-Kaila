import { Router } from "express";
import { createGuestRequest } from "./guest-requests.service.js";

const router = Router();

function routeErr(res, error, fallbackMsg) {
  const code = error?.statusCode === 503 ? 503 : 400;
  return res.status(code).json({
    ok: false,
    error: error?.message || fallbackMsg,
  });
}

router.post("/", async (req, res) => {
  try {
    const result = await createGuestRequest(req.body || {});
    return res.status(201).json({
      ok: true,
      id: String(result.id),
      bucket: result.bucket,
    });
  } catch (error) {
    return routeErr(res, error, "guest_request_create_failed");
  }
});

export default router;
