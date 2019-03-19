import { Services } from "./types";
import { BackendType } from "../types";

export function createServices(options : {backend : BackendType}) : Services {
  if (options.backend === 'memory') {
    return {
    }
  } else if (options.backend === 'client') {
    return {
    }
  } else {
    throw new Error(`Tried to create services with unknown backend: '${options.backend}'`)
  }
}
