/**
 * Redux Typed Hooks
 *
 * Use these hooks throughout the app instead of plain useDispatch and useSelector
 * to get proper TypeScript type inference.
 */

import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from ".";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
