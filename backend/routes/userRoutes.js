import express from "express";
import {
  createUser,
  loginUser,
  logoutCurrentUser,
  getAllUsers,
  getCurrentUserProfile,
  updateCurrentUserProfile,
  deleteUserById,
  getUserById,
  updateUserById,
} from "../controllers/userController.js";

import { authenticate,  } from "../middlewares/authMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(createUser)
  .get( getAllUsers);

router.post("/auth", loginUser);
router.post("/logout", logoutCurrentUser);

router
  .route("/profile")
  .get( getCurrentUserProfile)
  .put( updateCurrentUserProfile);

// ADMIN ROUTES 👇
router
  .route("/:id")
  .delete(  deleteUserById)
  .get( getUserById)
  .put(  updateUserById);

export default router;
