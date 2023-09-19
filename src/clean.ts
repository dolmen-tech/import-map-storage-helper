import { Engine, Action } from "./rules";
import { Mode } from "./modes";

export async function clean(mode: Mode, engine: Engine) {
  const packages = await mode.getPackages();
  packages.forEach((pack) => {
    if (engine.getAction(pack) == Action.DELETE) {
      mode.deletePackage(pack);
      return;
    }

    mode.keepPackage(pack);
  });
}
