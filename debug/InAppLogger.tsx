import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Level = "log" | "info" | "warn" | "error";

type LogItem = {
  id: string;
  ts: number;
  level: Level;
  message: string;
};

type LoggerApi = {
  add: (level: Level, ...args: any[]) => void;
  clear: () => void;
  get: () => LogItem[];
  subscribe: (cb: () => void) => () => void;
};

function safeStringify(value: any) {
  try {
    if (typeof value === "string") return value;
    if (value instanceof Error) {
      return `${value.name}: ${value.message}\n${value.stack ?? ""}`.trim();
    }
    return JSON.stringify(
      value,
      (_k, v) => (typeof v === "bigint" ? String(v) : v),
      2
    );
  } catch {
    try {
      return String(value);
    } catch {
      return "[Unstringifiable]";
    }
  }
}

function formatArgs(args: any[]) {
  return args.map(safeStringify).join(" ");
}

function createLogger(): LoggerApi {
  const items: LogItem[] = [];
  const subs = new Set<() => void>();
  const notify = () => subs.forEach((s) => s());

  const add: LoggerApi["add"] = (level, ...args) => {
    const message = formatArgs(args);
    items.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ts: Date.now(),
      level,
      message,
    });
    if (items.length > 500) items.splice(0, items.length - 500);
    notify();
  };

  return {
    add,
    clear: () => {
      items.length = 0;
      notify();
    },
    get: () => items.slice(),
    subscribe: (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
  };
}

const logger = createLogger();

function installGlobalHandlers() {
  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  console.log = (...args) => {
    logger.add("log", ...args);
    original.log(...args);
  };
  console.info = (...args) => {
    logger.add("info", ...args);
    original.info(...args);
  };
  console.warn = (...args) => {
    logger.add("warn", ...args);
    original.warn(...args);
  };
  console.error = (...args) => {
    logger.add("error", ...args);
    original.error(...args);
  };

  const anyGlobal = global as any;
  const ErrorUtils = anyGlobal?.ErrorUtils;
  const prevGlobalHandler =
    typeof ErrorUtils?.getGlobalHandler === "function"
      ? ErrorUtils.getGlobalHandler()
      : undefined;

  if (ErrorUtils?.setGlobalHandler) {
    ErrorUtils.setGlobalHandler((e: any, isFatal?: boolean) => {
      logger.add("error", isFatal ? "[FATAL]" : "[ERROR]", e);
      if (prevGlobalHandler) prevGlobalHandler(e, isFatal);
    });
  }

  if (typeof anyGlobal?.addEventListener === "function") {
    anyGlobal.addEventListener("unhandledrejection", (event: any) => {
      logger.add("error", "[UNHANDLED_REJECTION]", event?.reason ?? event);
    });
  }

  const rejectionTracking = anyGlobal?.__rejectionTracking;
  if (rejectionTracking?.enable) {
    try {
      rejectionTracking.enable({
        allRejections: true,
        onUnhandled: (id: any, error: any) => {
          logger.add("error", "[UNHANDLED_REJECTION]", id, error);
        },
        onHandled: (id: any) => {
          logger.add("info", "[HANDLED_REJECTION]", id);
        },
      });
    } catch {
      // ignore
    }
  }
}

let installed = false;
export function InAppLoggerInstaller() {
  React.useEffect(() => {
    if (installed) return;
    installed = true;
    installGlobalHandlers();
    console.info(
      `[InAppLogger] installed (${Platform.OS} ${String(Platform.Version)})`
    );
  }, []);
  return null;
}

function useLogItems() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => logger.subscribe(force), []);
  return logger.get();
}

function levelColor(level: Level) {
  switch (level) {
    case "error":
      return "#ff6b6b";
    case "warn":
      return "#ffd166";
    case "info":
      return "#8ecae6";
    default:
      return "#e6e6e6";
  }
}

export function InAppLogOverlay() {
  const [open, setOpen] = React.useState(false);
  const items = useLogItems();

  const errorCount = items.filter((i) => i.level === "error").length;
  const warnCount = items.filter((i) => i.level === "warn").length;

  const copyAll = async () => {
    const text = items
      .map((i) => {
        const time = new Date(i.ts).toISOString();
        return `[${time}] [${i.level.toUpperCase()}] ${i.message}`;
      })
      .join("\n\n");

    try {
      const Clipboard = require("expo-clipboard");
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(text);
        logger.add("info", "[InAppLogger] copied to clipboard");
        return;
      }
    } catch {
      // ignore
    }

    logger.add(
      "warn",
      "Clipboard not available. Install `expo-clipboard` to enable copy."
    );
  };

  return (
    <>
      <View pointerEvents="box-none" style={styles.fabWrap}>
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.fabText}>LOG</Text>
          <Text style={styles.fabSub}>
            E:{errorCount} W:{warnCount}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>In-app logs</Text>

            <View style={styles.headerBtns}>
              <Pressable onPress={copyAll} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>Copy</Text>
              </Pressable>
              <Pressable onPress={() => logger.clear()} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>Clear</Text>
              </Pressable>
              <Pressable onPress={() => setOpen(false)} style={styles.headerBtn}>
                <Text style={styles.headerBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={{ padding: 12 }}>
            {items.length === 0 ? (
              <Text style={styles.empty}>No logs yet.</Text>
            ) : (
              items
                .slice()
                .reverse()
                .map((i) => (
                  <View key={i.id} style={styles.item}>
                    <Text
                      style={[styles.itemMeta, { color: levelColor(i.level) }]}
                    >
                      {new Date(i.ts).toLocaleTimeString()} ·{" "}
                      {i.level.toUpperCase()}
                    </Text>
                    <Text selectable style={styles.itemMsg}>
                      {i.message}
                    </Text>
                  </View>
                ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: "absolute",
    right: 12,
    bottom: 24,
    zIndex: 999999,
  },
  fab: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  fabText: { color: "white", fontWeight: "700", letterSpacing: 0.5 },
  fabSub: { color: "#cbd5e1", marginTop: 2, fontSize: 12 },

  modalRoot: { flex: 1, backgroundColor: "#0b1220" },
  header: {
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2a44",
  },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "700" },
  headerBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    flexWrap: "wrap",
  },
  headerBtn: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#374151",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  headerBtnText: { color: "white", fontWeight: "600" },

  list: { flex: 1 },
  empty: { color: "#cbd5e1" },
  item: {
    borderWidth: 1,
    borderColor: "#1f2a44",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  itemMeta: { fontSize: 12, marginBottom: 6, fontWeight: "700" },
  itemMsg: { color: "#e5e7eb" },
});
