import { thingsboard } from "@/lib/tbClient";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Lấy dữ liệu từ body request
    const { token, deviceProfileId, pageSize, page, sortProperty, sortOrder } =
      await req.json();

    if (!token || !deviceProfileId) {
      return NextResponse.json(
        { error: "Token hoặc deviceProfileId không được cung cấp." },
        { status: 400 }
      );
    }

    // Chuẩn bị query
    const query = {
      pageSize,
      page,
      deviceProfileId,
      sortProperty,
      sortOrder,
    };

    // Gọi ThingsBoard API để lấy danh sách thiết bị
    const resp = await thingsboard.device().getTenantDeviceInfos(token, query);

    return NextResponse.json(resp.data);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Đã xảy ra lỗi khi lấy danh sách thiết bị.",
        details: err.message,
      },
      { status: err.response?.status || 500 }
    );
  }
}
