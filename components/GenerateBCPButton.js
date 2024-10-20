import React from 'react';
import { Button } from '@chakra-ui/react';
import { useRouter } from 'next/router';

const GenerateBCPButton = () => {
  const router = useRouter();

  const handleClick = () => {
    router.push('/generate-bcp');
  };

  return (
    <Button onClick={handleClick} colorScheme="blue">
      Generate BCP
    </Button>
  );
};

export default GenerateBCPButton;
