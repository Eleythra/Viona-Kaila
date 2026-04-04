import { Router } from "express";
import { createGuestRequest } from "./guest-requests.service.js";

const router = Router();

function clientFacingErrorMessage(error, fallbackMsg) {
  if (error == null) return fallbackMsg;
  if (typeof error === "string" && error.trim()) return error.trim();
  const m = error.message;
  if (typeof m === "string" && m.trim()) return m.trim();
  return fallbackMsg;
}

function routeErr(res, error, fallbackMsg) {
  const code = error?.statusCode === 503 ? 503 : 400;
  return res.status(code).json({
    ok: false,
    error: clientFacingErrorMessage(error, fallbackMsg),
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
