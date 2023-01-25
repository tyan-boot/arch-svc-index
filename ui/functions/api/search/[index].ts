import { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  MEILI_KEY: string;
  MEILI_URL: string;
}

export const onRequestPost: PagesFunction<Env> = async ({
  request,
  env,
  params,
}) => {
  const index = params.index;

  return fetch(`${env.MEILI_URL}/indexes/${index}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MEILI_KEY}`,
      "Content-Type": "application/json",
    },
    body: request.body,
  });
};
