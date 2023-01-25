import { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  MEILI_KEY: string;
  MEILI_URL: string;
}

type Unit = {
  filename: string;
  package: string;
  content: string;
};

export const onRequestGet: PagesFunction<Env> = async ({
  request,
  params,
  env,
}) => {
  const id = params.id;

  const response = await request.fetcher.fetch(
    `${env.MEILI_URL}/indexes/services/documents/${id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.MEILI_KEY}`,
      },
    }
  );

  if (response.status === 200) {
    const unit = await response.json<Unit>();

    return new Response(unit.content, {
      headers: {
        "x-package-name": unit.package,
        "x-unit-type": "service",
        "content-disposition": `attachment; filename="${unit.filename}"`,
      },
    });
  } else if (response.status === 404) {
    return new Response("", {
      status: 404,
    });
  } else {
    return new Response("internal error", {
      status: response.status,
    });
  }
};