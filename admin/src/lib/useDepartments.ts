import { useCallback, useEffect, useState } from "react";
import { api, type Department } from "./api";

let cache: Department[] | null = null;

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>(cache ?? []);
  const reload = useCallback(async () => {
    cache = await api.departments();
    setDepartments(cache);
  }, []);
  useEffect(() => {
    if (!cache) reload().catch(() => undefined);
  }, [reload]);
  return { departments, reload };
}
