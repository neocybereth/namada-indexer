import { Sdk } from "@namada/sdk/web";
import { QueryStatus, useQuery } from "@tanstack/react-query";
import { nativeTokenAddressAtom } from "atoms/chain";
import { useAtomValue } from "jotai";
import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import { getSdkInstance } from "utils/sdk";

type SdkContext = {
  sdk?: Sdk;
  maspParamsStatus: QueryStatus;
};

export const SdkContext = createContext<SdkContext>({
  sdk: undefined,
  maspParamsStatus: "pending",
});

const paramsUrl = "/params/";

export const SdkProvider: FunctionComponent<PropsWithChildren> = ({
  children,
}) => {
  const [sdk, setSdk] = useState<Sdk>();
  const nativeToken = useAtomValue(nativeTokenAddressAtom);

  // fetchAndStoreMaspParams() returns nothing,
  // so we return boolean on success for the query to succeed:
  const fetchMaspParams = async (): Promise<boolean | void> => {
    const { masp } = sdk!;

    return masp.hasMaspParams().then(async (hasMaspParams) => {
      if (hasMaspParams) {
        await masp.loadMaspParams("").catch((e) => Promise.reject(e));
        return true;
      }
      return masp
        .fetchAndStoreMaspParams(paramsUrl)
        .then(() => masp.loadMaspParams("").then(() => true))
        .catch((e) => {
          throw new Error(e);
        });
    });
  };

  const { status: maspParamsStatus } = useQuery({
    queryKey: ["sdk"],
    queryFn: fetchMaspParams,
    retry: 3,
    retryDelay: 3000,
  });

  useEffect(() => {
    if (nativeToken.data) {
      getSdkInstance().then((sdk) => {
        setSdk(sdk);
      });
    }
  }, [nativeToken.data]);

  return (
    <>
      <SdkContext.Provider value={{ sdk, maspParamsStatus }}>
        {children}
      </SdkContext.Provider>
    </>
  );
};

export const useSdk = (): SdkContext => {
  return useContext(SdkContext);
};