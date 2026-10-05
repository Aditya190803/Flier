"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export function ApiReference() {
  return (
    <SwaggerUI
      url="/openapi.json"
      docExpansion="list"
      defaultModelsExpandDepth={-1}
      displayRequestDuration
      filter
      showExtensions
      showCommonExtensions
    />
  );
}
