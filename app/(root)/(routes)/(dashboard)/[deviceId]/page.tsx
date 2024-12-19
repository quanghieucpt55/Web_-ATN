"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { config } from "@/lib/config";
import { thingsboard } from "@/lib/tbClient";
import axios from "axios";
import {
  BellIcon,
  AlertTriangle,
  Droplet,
  Thermometer,
  Compass,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import useWebSocket from "react-use-websocket";
import { TbEntity } from "thingsboard-api-client";
import InputThreshold from "../components/input-threshold";
import LatestTelemetryCard from "../components/latest-telemetry-card";
import TelemetryChart from "../components/telemetry-chart";

const tbServer = config.tbServer;
const keys = "temp,sm,tilt,longitude,latitude,warn";
const attrKeys = "sm_upper,sm_lower,tilt_upper,tilt_lower,buzzer";

const formatAttribute = (data: any) => {
  let format = {} as any;
  Object.values(data).map((item: any) => {
    format[item["key"]] = item["value"];
  });
  return format;
};

const DashboardPage = () => {
  const { deviceId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nodeName = searchParams.get("name") || "Không rõ tên node";
  const [loading, setLoading] = useState(false);
  const [latestData, setLatestData] = useState() as any;
  const [attribute, setAttribute] = useState() as any;
  const [socketUrl, setSocketUrl] = useState("");
  const [saveState, setSaveState] = useState(false);
  const [ping, setPing] = useState(false);
  const [edit, setEdit] = useState({ key: "", value: "" });

  const updateLatestData = (obj: any) => {
    setLatestData((prev: any) => {
      return {
        ...prev,
        tilt: [
          {
            ts: obj?.["tilt"]?.[0]?.[0],
            value: obj?.["tilt"]?.[0]?.[1],
          },
        ],
        sm: [
          {
            ts: obj?.["sm"]?.[0]?.[0],
            value: obj?.["sm"]?.[0]?.[1],
          },
        ],
        temp: obj?.["temp"]
          ? [
              {
                ts: obj?.["temp"]?.[0]?.[0],
                value: obj?.["temp"]?.[0]?.[1],
              },
            ]
          : prev?.["temp"],
        warn: obj?.["warn"]
          ? [
              {
                ts: obj?.["warn"]?.[0]?.[0],
                value: obj?.["warn"]?.[0]?.[1],
              },
            ]
          : prev?.["warn"],
        latitude: obj?.["latitude"]
          ? [
              {
                ts: obj?.["latitude"]?.[0]?.[0],
                value: obj?.["latitude"]?.[0]?.[1],
              },
            ]
          : prev?.["latitude"],
        longitude: obj?.["longitude"]
          ? [
              {
                ts: obj?.["longitude"]?.[0]?.[0],
                value: obj?.["longitude"]?.[0]?.[1],
              },
            ]
          : prev?.["longitude"],
      };
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
    const socketUrl = `wss://${tbServer}/api/ws/plugins/telemetry?token=${token}`;
    setSocketUrl(socketUrl);
  }, [router]);
  const { getWebSocket } = useWebSocket(socketUrl != "" ? socketUrl : null, {
    onOpen: () => {
      var object = {
        tsSubCmds: [
          {
            entityType: "DEVICE",
            entityId: deviceId,
            scope: "LATEST_TELEMETRY",
            cmdId: 10,
          },
        ],
        historyCmds: [],
        attrSubCmds: [],
      };
      var data = JSON.stringify(object);
      getWebSocket().send(data);
    },
    onMessage: (event) => {
      let obj = JSON.parse(event.data).data;
      setPing(!ping);
      updateLatestData(obj);
    },
    onClose: () => {},
  }) as any;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }

    const getData = async () => {
      setLoading(true);
      await axios
        .post(`/api/telemetry/latest`, {
          token,
          deviceId,
          keys,
        })
        .then((resp) => {
          setLatestData(resp.data);
        })
        .catch((error) => {
          console.error({ error });
          toast.error("Có lỗi xảy ra");
        })
        .finally(() => {
          setLoading(false);
        });
    };

    getData();
  }, [deviceId, router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }

    const getData = async () => {
      setLoading(true);
      await axios
        .post(`/api/telemetry/attribute`, {
          token,
          deviceId,
          keys: attrKeys,
        })
        .then((resp) => {
          setAttribute(formatAttribute(resp.data));
        })
        .catch((error) => {
          console.error({ error });
          toast.error("Có lỗi xảy ra");
        })
        .finally(() => {
          setLoading(false);
        });
    };

    getData();
  }, [saveState, deviceId, router]);

  const now = Date.now();

  const onSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }

    await axios
      .post(`/api/telemetry/attribute/save`, {
        token,
        deviceId,
        payload: {
          ...attribute,
          [edit.key]: parseFloat(edit.value),
        },
      })
      .then(() => {
        toast.success("Lưu ngưỡng thành công");
        setSaveState(!saveState);
      })
      .catch((error) => {
        console.error({ error });
        toast.error("Có gì đó sai sai");
      })
      .finally(() => {
        setEdit({ key: "", value: "" });
      });
  };

  const Maps = dynamic(() => import("../components/maps"), {
    ssr: false,
  });

  const onClickDevice = async (data: any) => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }

    await thingsboard
      .telemetry()
      .saveEntityAttributesV2(
        token as string,
        {
          entityId: deviceId as string,
          entityType: TbEntity.DEVICE,
          scope: "SHARED_SCOPE",
        },
        {
          ...data,
        }
      )
      .then(() => {
        toast.success("Lưu thành công");
        setSaveState(!saveState);
      })
      .catch((error) => {
        console.error({ error });
        toast.error("Có lỗi xảy ra");
      })
      .finally(() => {});
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 grid-cols-1">
        <LatestTelemetryCard
          title="Nhiệt độ"
          icon={<Thermometer className="h-8 w-8 text-muted-foreground" />}
          data={latestData?.["temp"][0]}
          loading={loading}
          unit="°C"
        ></LatestTelemetryCard>

        <LatestTelemetryCard
          title="Cảnh báo"
          icon={<AlertTriangle className="h-8 w-8 text-muted-foreground" />}
          loading={loading}
          isBoolean
          data={
            latestData?.["warn"]?.[0]?.value == 0
              ? { text: "An toàn", color: "text-green-600" }
              : latestData?.["warn"]?.[0]?.value == 1
              ? {
                  text: "Cảnh báo: Có nguy cơ sạt lở",
                  color: "text-yellow-500",
                }
              : { text: "Nguy hiểm: Nguy cơ cao", color: "text-red-600" }
          }
        >
          <div className="flex items-center justify-between w-full mt-4">
            <div className="flex items-center gap-2">
              <BellIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Chuông</span>
            </div>
            <Button
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded hover:bg-gray-800"
              onClick={() =>
                onClickDevice({
                  buzzer: attribute?.["buzzer"] == "true" ? "false" : "true",
                })
              }
            >
              {attribute?.["buzzer"] == "true" ? "Tắt" : "Bật"}
            </Button>
          </div>
        </LatestTelemetryCard>

        <LatestTelemetryCard
          title="Độ Ẩm"
          icon={<Droplet className="h-8 w-8 text-muted-foreground" />}
          data={latestData?.["sm"][0]}
          loading={loading}
          unit="%"
        >
          <div>
            {parseFloat(latestData?.["sm"][0]["value"]) >
            attribute?.["sm_upper"] ? (
              <Badge className="bg-red-600">Nguy hiểm</Badge>
            ) : parseFloat(latestData?.["sm"][0]["value"]) <
              attribute?.["sm_lower"] ? (
              <Badge className="bg-green-500">Ổn định</Badge>
            ) : (
              <Badge className="bg-yellow-600">Cảnh báo</Badge>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <InputThreshold
              title="Ngưỡng trên"
              targetKey="sm_upper"
              setEdit={setEdit}
              edit={edit}
              attribute={attribute}
              onSave={onSave}
            />
            <InputThreshold
              title="Ngưỡng dưới"
              targetKey="sm_lower"
              setEdit={setEdit}
              edit={edit}
              attribute={attribute}
              onSave={onSave}
            />
          </div>
        </LatestTelemetryCard>
        <LatestTelemetryCard
          title="Góc nghiêng"
          icon={<Compass className="h-8 w-8 text-muted-foreground" />}
          data={latestData?.["tilt"][0]}
          loading={loading}
          isInteger={true}
          unit="°"
        >
          <div>
            {parseFloat(latestData?.["tilt"][0]["value"]) >
            attribute?.["tilt_upper"] ? (
              <Badge className="bg-red-600">Nguy hiểm</Badge>
            ) : parseFloat(latestData?.["tilt"][0]["value"]) <
              attribute?.["tilt_lower"] ? (
              <Badge className="bg-green-500">Ổn định</Badge>
            ) : (
              <Badge className="bg-yellow-600">Cảnh báo</Badge>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <InputThreshold
              title="Ngưỡng trên"
              targetKey="tilt_upper"
              setEdit={setEdit}
              edit={edit}
              attribute={attribute}
              onSave={onSave}
            />
            <InputThreshold
              title="Ngưỡng dưới"
              targetKey="tilt_lower"
              setEdit={setEdit}
              edit={edit}
              attribute={attribute}
              onSave={onSave}
            />
          </div>
        </LatestTelemetryCard>
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Biểu Đồ Độ Ẩm</CardTitle>
          </CardHeader>
          <CardContent>
            <TelemetryChart
              entityId={deviceId as string}
              entityType={TbEntity.DEVICE}
              label={"Độ Ẩm"}
              targetkey={"sm"}
              startTs={0}
              endTs={now}
            />
          </CardContent>
        </Card>
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Biểu Đồ Góc Nghiêng</CardTitle>
          </CardHeader>
          <CardContent>
            <TelemetryChart
              entityId={deviceId as string}
              entityType={TbEntity.DEVICE}
              label={"Góc Nghiêng"}
              targetkey={"tilt"}
              startTs={0}
              endTs={now}
            />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bản Đồ</CardTitle>
        </CardHeader>
        <CardContent>
          <Maps selectedNodeName={nodeName} />
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
